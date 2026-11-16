/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadService(addDoc) {
  const db = {};
  const reference = {};
  const source = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../services/firebase.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const result = {};
  const context = {
    exports: result,
    require(name) {
      if (name === '../firebaseconfig') return { db };
      if (name === 'firebase/firestore') return {
        collection(database, name) {
          assert.equal(database, db);
          assert.equal(name, 'users');
          return reference;
        },
        addDoc(ref, data) { assert.equal(ref, reference); return addDoc(data); },
      };
      throw new Error('Unexpected import: ' + name);
    },
  };
  vm.runInNewContext(source, context);
  return result;
}

test('Firebase: envía los campos de la guía a users y devuelve el ID confirmado', async () => {
  let calls = 0;
  const service = loadService(async (data) => {
    calls++;
    assert.deepEqual(JSON.parse(JSON.stringify(data)), { tituloMensaje: 'Saludos Firebase', mensaje: 'Hola Mundo' });
    return { id: 'documento-confirmado' };
  });
  assert.equal(await service.crearDocumento(), 'documento-confirmado');
  assert.equal(calls, 1);
});

test('Firebase: propaga el rechazo del servidor sin devolver éxito', async () => {
  const rejection = Object.assign(new Error('Denied'), { code: 'permission-denied' });
  const service = loadService(async () => { throw rejection; });
  await assert.rejects(service.crearDocumento(), (error) => error === rejection);
});

test('Firebase: espera confirmación del servidor antes de devolver un ID', async () => {
  let confirm;
  let finished = false;
  const service = loadService(() => new Promise((resolve) => { confirm = resolve; }));
  const pending = service.crearDocumento().then((id) => { finished = true; return id; });
  await Promise.resolve();
  assert.equal(finished, false);
  confirm({ id: 'confirmado' });
  assert.equal(await pending, 'confirmado');
});

for (const [code, expected] of [
  ['permission-denied', /permisos/],
  ['firestore/permission-denied', /permisos/],
  ['unauthenticated', /autenticación/],
  ['unavailable', /internet/],
  ['deadline-exceeded', /internet/],
  ['not-found', /base de datos/],
  ['resource-exhausted', /resource-exhausted/],
]) {
  test('Firebase: mensaje para ' + code, () => {
    assert.match(loadService().mensajeErrorFirebase({ code }), expected);
  });
}

test('Firebase: errores sin código no hacen fallar la pantalla', () => {
  for (const error of [undefined, null, 'error', new Error('test'), 4, {}]) {
    assert.match(loadService().mensajeErrorFirebase(error), /No se pudo crear/);
  }
});

