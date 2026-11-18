/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function servicioAdmin() {
  const exports = {};
  const auth = { currentUser: null };
  let ahora = 1000;
  let activo = true;
  let fallo;
  const llamadas = [];
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../services/admin.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, Date: { now: () => ahora },
    require(name) {
      if (name === '../firebaseconfig') return { auth, db: {} };
      if (name === 'firebase/auth') return {
        inMemoryPersistence: 'memory',
        setPersistence: async (_, value) => llamadas.push(['persistencia', value]),
        signInWithEmailAndPassword: async (_, correo, clave) => {
          if (fallo) throw fallo;
          assert.equal(correo, 'admin@example.com');
          assert.equal(clave, 'clave-de-prueba');
          auth.currentUser = { uid: 'admin-uid' };
        },
        signOut: async () => { auth.currentUser = null; },
      };
      if (name === 'firebase/firestore') return {
        doc: (_, coleccion, id) => { assert.equal(coleccion, 'administradores'); assert.equal(id, 'admin-uid'); return {}; },
        getDocFromServer: async () => ({ exists: () => activo !== null, data: () => ({ activo }) }),
      };
      throw new Error(name);
    },
  });
  return { service: exports, auth, llamadas, reloj: (value) => { ahora = value; }, rol: (value) => { activo = value; }, fallar: (value) => { fallo = value; } };
}

test('administración: exige credenciales y rol activo; no mantiene sesión en disco', async () => {
  const f = servicioAdmin();
  await assert.rejects(f.service.exigirAdministrador(), /contraseña/);
  await f.service.iniciarAdministracion(' admin@example.com ', 'clave-de-prueba');
  assert.equal(f.service.administracionVigente(), true);
  assert.deepEqual(f.llamadas, [['persistencia', 'memory']]);
  await f.service.exigirAdministrador();
  await f.service.cerrarAdministracion();
  assert.equal(f.service.administracionVigente(), false);
  assert.equal(f.auth.currentUser, null);
});

test('administración: una contraseña incorrecta o un rol inexistente no abre acceso', async () => {
  for (const rol of [false, null]) {
    const f = servicioAdmin();
    f.rol(rol);
    await assert.rejects(f.service.iniciarAdministracion('admin@example.com', 'clave-de-prueba'), /permisos/);
    assert.equal(f.service.administracionVigente(), false);
    assert.equal(f.auth.currentUser, null);
  }
  const f = servicioAdmin();
  f.fallar({ code: 'auth/invalid-credential' });
  await assert.rejects(f.service.iniciarAdministracion('admin@example.com', 'incorrecta'), /credenciales/);
  assert.equal(f.service.administracionVigente(), false);
});

test('administración: expira a los cinco minutos y revalida una revocación de rol', async () => {
  const f = servicioAdmin();
  await f.service.iniciarAdministracion('admin@example.com', 'clave-de-prueba');
  f.reloj(301000);
  assert.equal(f.service.administracionVigente(), false);
  await assert.rejects(f.service.exigirAdministrador(), /contraseña/);
  await f.service.iniciarAdministracion('admin@example.com', 'clave-de-prueba');
  f.rol(false);
  await assert.rejects(f.service.exigirAdministrador(), /permisos/);
  assert.equal(f.service.administracionVigente(), false);
});

test('administración: comunica configuración pendiente, desconexión e intentos excesivos', async () => {
  for (const [code, mensaje] of [['auth/operation-not-allowed', /configurado/], ['auth/network-request-failed', /conexión/], ['auth/too-many-requests', /Demasiados/]]) {
    const f = servicioAdmin();
    f.fallar({ code });
    await assert.rejects(f.service.iniciarAdministracion('admin@example.com', 'clave-de-prueba'), mensaje);
    assert.equal(f.service.administracionVigente(), false);
  }
});
