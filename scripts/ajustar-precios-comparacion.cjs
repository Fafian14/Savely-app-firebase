// Consulta por defecto. --aplicar usa la sesión de Firebase CLI del propietario.
require('./register-typescript.cjs');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { calcularPreciosComparacion } = require('../store/comparison-prices.ts');
const proyecto = 'savely-4f272';
const documentos = `https://firestore.googleapis.com/v1/projects/${proyecto}/databases/(default)/documents`;

async function solicitar(url, opciones = {}) {
  const respuesta = await fetch(url, { ...opciones, signal: AbortSignal.timeout(30000) });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(`Firestore: ${datos.error?.status ?? respuesta.status}. ${datos.error?.message ?? 'No se completó la operación.'}`);
  return datos;
}

function bibliotecaFirebase() {
  const parametro = process.argv.indexOf('--firebase-cli');
  const candidatos = parametro >= 0 ? [process.argv[parametro + 1]] : [];
  for (const carpeta of (process.env.PATH ?? '').split(path.delimiter)) {
    candidatos.push(path.resolve(carpeta, '..', 'firebase-tools'), path.join(carpeta, 'node_modules', 'firebase-tools'));
  }
  for (const carpeta of candidatos.filter(Boolean)) {
    const lib = path.join(carpeta, 'lib');
    if (fs.existsSync(path.join(lib, 'auth.js')) && fs.existsSync(path.join(lib, 'scopes.js'))) return lib;
  }
  throw new Error('Ejecuta con Firebase CLI disponible: npx.cmd --yes --package firebase-tools@15.36.0 --call "npm run firebase:ajustar-precios -- --aplicar"');
}

async function autorizacion() {
  const lib = bibliotecaFirebase();
  const auth = require(path.join(lib, 'auth.js'));
  const scopes = require(path.join(lib, 'scopes.js'));
  const cuenta = auth.getGlobalDefaultAccount();
  if (!cuenta?.tokens?.refresh_token) throw new Error('Primero inicia sesión: npx.cmd firebase-tools login');
  const token = await auth.getAccessToken(cuenta.tokens.refresh_token, [scopes.CLOUD_PLATFORM, scopes.FIREBASE_PLATFORM]);
  if (!token.access_token) throw new Error('No se pudo autorizar la sesión de Firebase CLI.');
  return { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' };
}

async function leerDocumentos() {
  const encontrados = [];
  let pagina;
  do {
    const url = new URL(documentos + '/productos');
    url.searchParams.set('pageSize', '1000');
    if (pagina) url.searchParams.set('pageToken', pagina);
    const respuesta = await solicitar(url);
    encontrados.push(...(respuesta.documents ?? []));
    pagina = respuesta.nextPageToken;
  } while (pagina);
  return encontrados;
}

function leerProducto(doc) {
  const f = doc.fields;
  return {
    id: Number(f.id?.integerValue), nombre: f.nombre?.stringValue,
    precios: Object.fromEntries(Object.entries(f.precios?.mapValue?.fields ?? {}).map(([clave, valor]) => [clave, Number(valor.integerValue ?? valor.doubleValue)])),
    preciosPrueba: (f.preciosPrueba?.arrayValue?.values ?? []).map((valor) => valor.stringValue),
  };
}

async function main() {
  const actuales = await leerDocumentos();
  const plan = actuales.flatMap((doc) => {
    const producto = leerProducto(doc);
    if (!producto.preciosPrueba.length) return [];
    const precios = calcularPreciosComparacion(producto);
    if (JSON.stringify(precios) === JSON.stringify(producto.precios)) return [];
    return [{ documento: doc, producto, precios }];
  });
  console.table(plan.map(({ producto, precios }) => ({ id: producto.id, producto: producto.nombre, ...precios })));
  console.log(`${plan.length} productos para ajustar. Los precios sin marca provisional se conservan.`);
  if (!process.argv.includes('--aplicar')) { console.log('Consulta sin cambios. Añade --aplicar para actualizar con respaldo.'); return; }
  if (!plan.length) return;
  if (plan.length > 500) throw new Error('El lote supera 500 productos. Se requiere revisar la migración.');
  // Las credenciales nunca se imprimen, se copian al proyecto ni se escriben en el respaldo.
  const headers = await autorizacion();
  const indice = process.argv.indexOf('--respaldo');
  const respaldo = indice >= 0 ? path.resolve(process.argv[indice + 1]) : path.join(os.homedir(), 'Documents', 'Savely-respaldos', `precios-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(respaldo), { recursive: true });
  fs.writeFileSync(respaldo, JSON.stringify({ proyecto, documentos: actuales, plan: plan.map(({ producto, precios }) => ({ id: producto.id, antes: producto.precios, despues: precios })) }, null, 2), { flag: 'wx' });
  const writes = plan.map(({ documento, precios }) => ({
    update: { name: documento.name, fields: { precios: { mapValue: { fields: Object.fromEntries(Object.entries(precios).map(([clave, valor]) => [clave, { integerValue: String(valor) }])) } } } },
    updateMask: { fieldPaths: ['precios'] },
    updateTransforms: [{ fieldPath: 'actualizadoEn', setToServerValue: 'REQUEST_TIME' }],
    currentDocument: { updateTime: documento.updateTime },
  }));
  await solicitar(documentos + ':commit', { method: 'POST', headers, body: JSON.stringify({ writes }) });
  const posteriores = new Map((await leerDocumentos()).map((d) => [d.name, leerProducto(d)]));
  for (const cambio of plan) {
    const actual = posteriores.get(cambio.documento.name);
    if (!actual || Object.entries(cambio.precios).some(([clave, precio]) => actual.precios[clave] !== precio))
      throw new Error(`La comprobación posterior del producto ${cambio.producto.id} requiere revisión. Respaldo: ${respaldo}`);
  }
  console.log(`CONFIRMADO: ${plan.length} productos ajustados. Respaldo: ${respaldo}`);
}

main().catch((error) => {
  if (error.code === 'EPERM' || error.code === 'EACCES') console.error('Windows no permitió acceder a la sesión de Firebase CLI o al respaldo. Ejecuta este comando desde tu PowerShell habitual.');
  else console.error(error.message);
  process.exitCode = 1;
});
