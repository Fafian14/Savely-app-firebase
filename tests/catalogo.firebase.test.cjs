/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const projectRequire = createRequire(path.join(__dirname, '../services/catalogo.ts'));
const { productos } = projectRequire('../store/products.store.ts');
const { guardarProducto } = projectRequire('../store/catalog.ts');

const clone = (value) => structuredClone(value);
function fakeFirestore() {
  const data = new Map();
  const listeners = new Map();
  let sequence = 0;
  let queue = Promise.resolve();
  let failure;
  let adminPermitido = true;
  const snap = (ref) => ({
    id: ref.id, exists: () => data.has(ref.path),
    data: () => data.has(ref.path) ? clone(data.get(ref.path)) : undefined,
  });
  const query = (ref) => ({
    docs: [...data.keys()].filter((key) => key.startsWith(ref.path + '/') && !key.slice(ref.path.length + 1).includes('/')).map((key) => snap({ path: key, id: key.split('/').at(-1) })),
    metadata: { hasPendingWrites: false, fromCache: false },
  });
  const api = {
    collection(base, name) { return { path: base.path ? base.path + '/' + name : name }; },
    doc(base, ...parts) {
      const joined = parts.length ? parts.join('/') : 'auto-' + (++sequence);
      const name = base.path ? base.path + '/' + joined : joined;
      return { path: name, id: name.split('/').at(-1) };
    },
    serverTimestamp: () => 'server-time',
    async getDocsFromServer(ref) { if (failure) throw failure; return query(ref); },
    runTransaction(db, callback) {
      const task = queue.then(async () => {
        if (failure) throw failure;
        const writes = [];
        let writing = false;
        const tx = {
          async get(ref) { assert.equal(writing, false, 'Firestore exige leer antes de escribir'); return snap(ref); },
          set(ref, value) { writing = true; writes.push(() => data.set(ref.path, clone(value))); },
          update(ref, value) { writing = true; writes.push(() => { assert.ok(data.has(ref.path)); data.set(ref.path, { ...data.get(ref.path), ...clone(value) }); }); },
          delete(ref) { writing = true; writes.push(() => data.delete(ref.path)); },
        };
        const result = await callback(tx);
        for (const write of writes) write();
        return result;
      });
      queue = task.catch(() => {});
      return task;
    },
    onSnapshot(ref, options, receive, error) {
      const handler = { receive, error, options };
      listeners.set(ref.path, handler);
      return () => listeners.delete(ref.path);
    },
  };
  const filename = path.join(__dirname, '../services/catalogo.ts');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (name === 'firebase/firestore') return api;
      if (name === '../firebaseconfig') return { db: {} };
      if (name === './admin') return { exigirAdministrador: async () => { if (!adminPermitido) throw new Error('Se requiere administrador'); } };
      return projectRequire(name);
    },
  });
  return {
    service: exports, data, listeners,
    permitirAdmin: (valor) => { adminPermitido = valor; },
    fail: (cause) => { failure = cause; },
    emit(name, metadata = {}) {
      const snapshot = query({ path: name });
      snapshot.metadata = { ...snapshot.metadata, ...metadata };
      listeners.get(name).receive(snapshot);
    },
  };
}
const normalize = (v) => JSON.parse(JSON.stringify(v));
const original = () => ({ productos: clone(productos), lista: [1], siguienteId: 19, versionImagenes: 1 });
const input = (nombre = 'Producto nuevo') => ({ ...productos[0], nombre, descripcion: 'Descripcion del producto' });

test('precios de prueba: conserva la identificación y rechaza tiendas inexistentes o sin precio', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  const creado = await f.service.guardarProductoRemoto({ ...input(), precios: { jumbo: 1000 }, preciosPrueba: ['jumbo'] });
  const leido = f.service.leerProductoRemoto(f.data.get('productos/' + creado.id), String(creado.id));
  assert.deepEqual(normalize(leido.preciosPrueba), ['jumbo']);
  for (const preciosPrueba of [['desconocida'], ['santaIsabel'], ['jumbo', 'jumbo']]) {
    await assert.rejects(f.service.guardarProductoRemoto({ ...input(), precios: { jumbo: 1000 }, preciosPrueba }), /prueba/);
  }
});

test('administración: impide crear, editar o borrar sin autorización, incluso llamando al servicio directamente', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  f.permitirAdmin(false);
  const antes = clone([...f.data.entries()]);
  await assert.rejects(f.service.guardarProductoRemoto(input()), /administrador/);
  await assert.rejects(f.service.guardarProductoRemoto(input(), 1), /administrador/);
  await assert.rejects(f.service.eliminarProductoRemoto(1), /administrador/);
  assert.deepEqual([...f.data.entries()], antes);
  assert.equal(f.data.get('configuracion/catalogo').siguienteId, 19);
  f.permitirAdmin(true);
  assert.equal((await f.service.guardarProductoRemoto(input())).id, 19);
});

test('migración: carga 18 productos con precios y cuatro supermercados sin duplicar al repetir', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  for (const p of productos) assert.deepEqual(f.data.get('productos/' + p.id).precios, p.precios);
  assert.equal(f.data.get('configuracion/catalogo').siguienteId, 19);
  assert.equal(f.data.get('supermercados/lider').nombre, 'Líder');
  assert.equal(f.data.get('supermercados/unimarc').distancia, 1.1);
  assert.equal(f.data.size, 23);
  await f.service.inicializarCatalogo();
  assert.equal(f.data.size, 23);
});

test('migración: respeta un producto existente y calcula IDs a partir del mayor ID remoto', async () => {
  const f = fakeFirestore();
  f.data.set('productos/1', input('Leche ya editada'));
  f.data.set('productos/90', { ...productos[1], id: 90 });
  await f.service.inicializarCatalogo();
  assert.equal(f.data.get('productos/1').nombre, 'Leche ya editada');
  assert.equal(f.data.get('configuracion/catalogo').siguienteId, 91);
});

test('catálogo vacío: la inicialización no repone productos borrados', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  for (const p of productos) await f.service.eliminarProductoRemoto(p.id);
  await f.service.inicializarCatalogo();
  assert.equal([...f.data.keys()].filter((k) => k.startsWith('productos/')).length, 0);
  assert.equal(f.data.get('configuracion/catalogo').siguienteId, 19);
});

test('CRUD: crear, editar y borrar conserva el ID y no reutiliza IDs borrados', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  const created = await f.service.guardarProductoRemoto(input('Nuevo'));
  assert.equal(created.id, 19);
  await f.service.guardarProductoRemoto({ ...created, precios: { lider: 100, unimarc: 200 } }, 19);
  assert.equal(f.data.get('productos/19').precios.lider, 100);
  assert.equal(f.data.get('configuracion/catalogo').siguienteId, 20);
  await f.service.eliminarProductoRemoto(19);
  assert.equal(f.data.has('productos/19'), false);
  assert.equal((await f.service.guardarProductoRemoto(input())).id, 20);
});

test('dos altas concurrentes reciben IDs distintos', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  const result = await Promise.all([f.service.guardarProductoRemoto(input('A')), f.service.guardarProductoRemoto(input('B'))]);
  assert.deepEqual(result.map((p) => p.id), [19, 20]);
  assert.equal(f.data.get('productos/19').nombre, 'A');
  assert.equal(f.data.get('productos/20').nombre, 'B');
});

test('validación: no guarda precios inválidos ni incrementa el contador tras fallar', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  await assert.rejects(f.service.guardarProductoRemoto({ ...input(), precios: { lider: -1, unimarc: 3 } }), /precio/);
  assert.equal(f.data.has('productos/19'), false);
  assert.equal(f.data.get('configuracion/catalogo').siguienteId, 19);
});

test('edición: un producto borrado por otro cliente no se vuelve a crear', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  await f.service.eliminarProductoRemoto(1);
  await assert.rejects(f.service.guardarProductoRemoto(input(), 1), /ya no existe/);
  assert.equal(f.data.has('productos/1'), false);
});

test('validación reforzada: altas y ediciones inválidas conservan documentos y contador', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  const previo = clone([...f.data.entries()]);
  for (const cambio of [
    { nombre: '!!!@@@' }, { descripcion: 'Texto\u0000' }, { tamano: 'Caja\u200b' },
    { unidad: 'ud', contenido: 0.5 }, { unidad: 'kg', contenido: 51 },
    { unidad: 'L', contenido: 51 }, { unidad: 'g', contenido: 50001 },
    { unidad: 'ml', contenido: 50001 }, { unidad: 'ud', contenido: 1001 },
    { precios: { lider: 500001 } }, { precios: { jumbo: 500001 } },
  ]) {
    for (const id of [undefined, 1]) {
      await assert.rejects(f.service.guardarProductoRemoto({ ...input(), ...cambio }, id));
      assert.deepEqual([...f.data.entries()], previo);
    }
  }
});

test('contador inconsistente: rechaza el alta sin sobrescribir un producto existente', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  f.data.set('productos/19', { ...input('Conservar'), id: 19 });
  await assert.rejects(f.service.guardarProductoRemoto(input()), /contador/);
  assert.equal(f.data.get('productos/19').nombre, 'Conservar');
});

test('migración local: importa altas y ediciones, conserva el carrito y soporta reintentos', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  let local = guardarProducto(original(), input('Edición local'), 1);
  local = guardarProducto(local, input('Alta local'));
  local.lista = [1, 19];
  const map = await f.service.migrarCatalogoLocal(local, 'dispositivo-a');
  assert.equal(f.data.get('productos/1').nombre, 'Edición local');
  assert.equal(f.data.get('productos/19').nombre, 'Alta local');
  const size = f.data.size;
  assert.deepEqual(normalize(await f.service.migrarCatalogoLocal(local, 'dispositivo-a')), normalize(map));
  assert.equal(f.data.size, size);
  assert.deepEqual(local.lista.map((id) => map[id]), [1, 19]);
});

test('migración local: preserva ambas versiones ante una colisión de ID y remapea el carrito', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  await f.service.guardarProductoRemoto(input('Alta remota'));
  const local = guardarProducto(original(), input('Alta local diferente'));
  const map = await f.service.migrarCatalogoLocal(local, 'dispositivo-b');
  assert.equal(map[19], 20);
  assert.equal(f.data.get('productos/19').nombre, 'Alta remota');
  assert.equal(f.data.get('productos/20').nombre, 'Alta local diferente');
});

test('migración local: una edición remota no se sobrescribe con una edición local distinta', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  await f.service.guardarProductoRemoto(input('Edición remota'), 1);
  const local = guardarProducto(original(), input('Edición local'), 1);
  const map = await f.service.migrarCatalogoLocal(local, 'dispositivo-c');
  assert.equal(map[1], 19);
  assert.equal(f.data.get('productos/1').nombre, 'Edición remota');
  assert.equal(f.data.get('productos/19').nombre, 'Edición local');
});

test('migración local: los productos originales borrados no resucitan desde una copia antigua', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  await f.service.eliminarProductoRemoto(1);
  await f.service.migrarCatalogoLocal(original(), 'dispositivo-d');
  assert.equal(f.data.has('productos/1'), false);
});

test('migración local: no modifica ni borra el respaldo recibido', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  const local = original();
  const before = clone(local);
  await f.service.migrarCatalogoLocal(local, 'dispositivo-e');
  assert.deepEqual(local, before);
});

test('permisos: un rechazo real se propaga y no se publica como éxito', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  const cause = Object.assign(new Error('denied'), { code: 'permission-denied' });
  f.fail(cause);
  await assert.rejects(f.service.guardarProductoRemoto(input()), (e) => e === cause);
  assert.equal(f.data.has('productos/19'), false);
  assert.match(f.service.mensajeErrorCatalogo(cause), /permisos/);
});

test('lectura: rechaza IDs incompatibles y precios corruptos', () => {
  const f = fakeFirestore();
  assert.throws(() => f.service.leerProductoRemoto(productos[0], '2'), /ID/);
  assert.throws(() => f.service.leerProductoRemoto({ ...productos[0], precios: { lider: 0, unimarc: 3 } }, '1'));
  assert.deepEqual(normalize(f.service.leerProductoRemoto({ ...productos[0], actualizadoEn: 'fecha' }, '1')), productos[0]);
});

test('supermercados: valida referencias de precio, moneda y distancia', () => {
  const f = fakeFirestore();
  const store = { id: 'lider', nombre: 'Líder', moneda: 'CLP', distancia: 0.4 };
  assert.equal(f.service.leerSupermercadoRemoto(store, 'lider').distancia, 0.4);
  assert.throws(() => f.service.leerSupermercadoRemoto({ ...store, distancia: -1 }, 'lider'));
  assert.throws(() => f.service.leerSupermercadoRemoto(store, 'otro'));
});

test('tiempo real: publica cambios confirmados, omite escrituras pendientes y permite desuscribirse', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  const received = [];
  const stop = f.service.observarProductos((items, cache) => received.push({ items, cache }), assert.fail);
  await f.service.guardarProductoRemoto(input());
  f.emit('productos', { hasPendingWrites: true });
  assert.equal(received.length, 0);
  f.emit('productos');
  assert.equal(received[0].items.length, 19);
  assert.equal(received[0].cache, false);
  await f.service.eliminarProductoRemoto(1);
  f.emit('productos');
  assert.equal(received[1].items.some((p) => p.id === 1), false);
  stop();
  assert.equal(f.listeners.has('productos'), false);
});

test('tiempo real: un documento mal formado produce error y no reemplaza el catálogo', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  let received = false;
  let error;
  f.service.observarProductos(() => { received = true; }, (e) => { error = e; });
  f.data.set('productos/1', { ...productos[0], id: 99 });
  f.emit('productos');
  assert.equal(received, false);
  assert.match(error.message, /ID/);
});

test('tiempo real: notifica los supermercados de Firestore y detecta una tienda faltante', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  let count = 0;
  let error;
  f.service.observarSupermercados((stores) => { count = stores.length; }, (e) => { error = e; });
  f.emit('supermercados');
  assert.equal(count, 4);
  f.data.delete('supermercados/unimarc');
  f.emit('supermercados');
  assert.match(error.message, /Faltan/);
});

test('ofertas: usa las distancias recibidas de Firestore al filtrar', () => {
  const { filtrarOfertas } = projectRequire('../store/offers.ts');
  const filter = { radio: 0.5, periodo: 'hoy', soloLista: false };
  assert.equal(filtrarOfertas([productos[0]], [], filter, [{ nombre: 'Líder', distancia: 10 }]).length, 0);
  assert.equal(filtrarOfertas([productos[0]], [], filter, [{ nombre: 'Líder', distancia: 0.1 }]).length, 1);
});

test('cuatro tiendas: compara precios registrados y omite totales incompletos', () => {
  const { compararPrecios, sumarPrecios, calcularAhorroCompra } = projectRequire('../store/product-comparison.ts');
  const a = { ...productos[0], precios: { lider: 1000, unimarc: 1200, jumbo: 800, santaIsabel: 900 } };
  const b = { ...productos[1], precios: { lider: 2000, unimarc: 2100, santaIsabel: 1900 } };
  assert.equal(compararPrecios(a.precios).mejorSupermercado, 'Jumbo');
  const total = sumarPrecios([a, b]);
  assert.equal(total.jumbo, undefined);
  assert.equal(total.santaIsabel, 2800);
  assert.equal(calcularAhorroCompra([a, b]).totalUnaTienda, 2800);
  assert.equal(calcularAhorroCompra([a, b]).totalMejoresPrecios, 2700);
  assert.equal(calcularAhorroCompra([a, b]).ahorro, 100);
});

test('Firestore: persiste precios nuevos, permite retirarlos y no los rellena al leer', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  assert.equal(f.data.get('productos/1').precios.jumbo, undefined);
  await f.service.guardarProductoRemoto({ ...input(productos[0].nombre), precios: { ...productos[0].precios, jumbo: 800, santaIsabel: 900 } }, 1);
  assert.equal(f.data.get('productos/1').precios.jumbo, 800);
  assert.equal(f.service.leerProductoRemoto(f.data.get('productos/1'), '1').precios.santaIsabel, 900);
  await f.service.guardarProductoRemoto(input(productos[0].nombre), 1);
  assert.equal(Object.hasOwn(f.data.get('productos/1').precios, 'jumbo'), false);
});

test('migración desde dos tiendas: añade las nuevas sin cambiar productos ni contador', async () => {
  const f = fakeFirestore();
  await f.service.inicializarCatalogo();
  f.data.delete('supermercados/jumbo');
  f.data.delete('supermercados/santaIsabel');
  const before = clone([...f.data.entries()].filter(([key]) => key.startsWith('productos/') || key.startsWith('configuracion/')));
  await f.service.inicializarCatalogo();
  const after = clone([...f.data.entries()].filter(([key]) => key.startsWith('productos/') || key.startsWith('configuracion/')));
  assert.deepEqual(after, before);
  assert.equal(f.data.get('supermercados/jumbo').distancia, undefined);
  assert.equal(f.data.get('supermercados/santaIsabel').nombre, 'Santa Isabel');
});

test('compra sin tienda completa: no publica una referencia de ahorro inventada', () => {
  const { calcularAhorroCompra, sumarPrecios } = projectRequire('../store/product-comparison.ts');
  const a = { ...productos[0], precios: { jumbo: 800 } };
  const b = { ...productos[1], precios: { santaIsabel: 900 } };
  assert.deepEqual(sumarPrecios([a, b]), {});
  assert.equal(calcularAhorroCompra([a, b]).totalUnaTienda, null);
  assert.equal(calcularAhorroCompra([a, b]).ahorro, 0);
});

test('promedio por categoría: no cuenta una categoría sin comparación como ahorro cero', () => {
  const { calcularAhorroPromedio } = projectRequire('../store/product-comparison.ts');
  const a = { ...productos[0], categoria: 'Alimentos', precios: { lider: 100, unimarc: 120 } };
  const b = { ...productos[1], categoria: 'Bebidas', precios: { jumbo: 200 } };
  assert.equal(calcularAhorroPromedio([a,b], ['Alimentos','Bebidas']),20);
});
