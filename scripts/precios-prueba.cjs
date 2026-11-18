// Completa solo precios desconocidos. No reemplaza precios, textos ni IDs existentes.
require('./register-typescript.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { db } = require('../firebaseconfig.ts');
const { supermercados } = require('../models/Product.ts');
const { leerProductoRemoto } = require('../services/catalogo.ts');
const { collection, getDocsFromServer, doc, runTransaction, serverTimestamp, terminate } = require('firebase/firestore');

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  const indice = process.argv.indexOf('--respaldo');
  if (aplicar && (indice < 0 || !process.argv[indice + 1])) throw new Error('Indica --respaldo con una ruta JSON nueva antes de aplicar.');
  const snapshot = await getDocsFromServer(collection(db, 'productos'));
  const originales = snapshot.docs.map((d) => {
    leerProductoRemoto(d.data(), d.id);
    return { id: d.id, data: d.data() };
  });
  const faltantes = originales.reduce((n, d) => n + supermercados.filter((s) => d.data.precios[s.clave] === undefined).length, 0);
  console.log(`${originales.length} productos; ${faltantes} precios faltantes. Valor de prueba: 1000 CLP.`);
  if (!aplicar) { console.log('Solo consulta. Usa --aplicar --respaldo RUTA.json para completar.'); return; }
  const respaldo = path.resolve(process.argv[indice + 1]);
  fs.writeFileSync(respaldo, JSON.stringify({ creadoEn: new Date().toISOString(), productos: originales }, null, 2), { flag: 'wx' });
  let agregados = 0;
  for (const original of originales) {
    const cantidad = await runTransaction(db, async tx => {
      const ref = doc(db, 'productos', original.id);
      const actual = await tx.get(ref);
      if (!actual.exists()) return 0;
      const p = leerProductoRemoto(actual.data(), original.id);
      const faltan = supermercados.filter((s) => p.precios[s.clave] === undefined).map((s) => s.clave);
      if (!faltan.length) return 0;
      const precios = { ...p.precios };
      for (const clave of faltan) precios[clave] = 1000;
      tx.update(ref, { precios, preciosPrueba: [...new Set([...(p.preciosPrueba ?? []), ...faltan])], actualizadoEn: serverTimestamp() });
      return faltan.length;
    });
    agregados += cantidad;
  }
  console.log(`Completados ${agregados} precios de prueba sin reemplazar los existentes. Respaldo: ${respaldo}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => terminate(db));
