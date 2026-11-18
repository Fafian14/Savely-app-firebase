/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/products/form.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function pantalla(id, autorizado = false) {
  const exports = {};
  const hooks = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(source, { exports, require(name) {
    if (name === 'react') return { useState(value) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = typeof value === 'function' ? value() : value;
      return [hooks[i], (next) => { hooks[i] = next; }];
    } };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'expo-router') return { useLocalSearchParams: () => ({ id }) };
    if (name === 'react-native') return { Platform: { OS: 'android' }, KeyboardAvoidingView: 'KeyboardAvoidingView', ScrollView: 'ScrollView', Text: 'Text', View: 'View' };
    if (name === '@/services/admin') return { administracionVigente: () => autorizado };
    if (name === '@/store/CatalogProvider') return { useCatalog: () => ({ productos: [{ id: 1 }] }) };
    if (name === '@/components/AdminAccess') return { default: 'AdminAccess' };
    if (name === '@/components/ProductForm') return { default: 'ProductForm' };
    if (name === '@/components/Header') return { default: 'Header' };
    throw new Error(name);
  } });
  function nodes() {
    cursor = 0;
    const result = [];
    function visit(node) {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node?.props) return;
      result.push(node);
      visit(node.props.children);
    }
    visit(exports.default());
    return result;
  }
  return {
    nodes,
    autorizar() {
      const gate = nodes().find((node) => node.type === 'AdminAccess');
      assert.ok(gate);
      autorizado = true;
      gate.props.onAuthorized();
    },
  };
}

test('acceso: crear y editar por URL directa muestran administrador y ocultan el formulario sin sesión', () => {
  for (const id of [undefined, '1']) {
    const p = pantalla(id);
    assert.ok(p.nodes().some((node) => node.type === 'AdminAccess'));
    assert.equal(p.nodes().some((node) => node.type === 'ProductForm'), false);
    p.autorizar();
    assert.equal(p.nodes().some((node) => node.type === 'AdminAccess'), false);
    assert.ok(p.nodes().some((node) => node.type === 'ProductForm'));
  }
});

test('acceso: una sesión administradora vigente permite añadir sin duplicar el diálogo', () => {
  const p = pantalla(undefined, true);
  assert.equal(p.nodes().some((node) => node.type === 'AdminAccess'), false);
  assert.ok(p.nodes().some((node) => node.type === 'ProductForm'));
});
