/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');
const filename = path.join(__dirname, '../components/ProductForm.tsx');
const projectRequire = createRequire(filename);
const { parsearCamposNumericos, formatearContenido } = projectRequire('../store/product-form.ts');
const { productos: semilla } = projectRequire('../store/products.store.ts');
const productos = semilla.map((p) => ({ ...p, descripcion: p.descripcion.replace(/[^\p{L}\p{M}\p{N} ]/gu, '') }));
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

// Ejecuta el componente real. Los inputs actualizan sus hooks y el guardado se
// sustituye por un registro en memoria para comprobar que un rechazo no escribe.
function montarFormulario(producto) {
  const states = [];
  let hook = 0;
  const guardados = [];
  const navegaciones = [];
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (name === 'react') return {
        useState(value) {
          const i = hook++;
          if (!(i in states)) states[i] = value;
          return [states[i], (next) => { states[i] = typeof next === 'function' ? next(states[i]) : next; }];
        },
      };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react-native') return Object.fromEntries(['Pressable', 'Text', 'TextInput', 'View'].map((x) => [x, x]));
      if (name === 'expo-router') return { router: { replace: (ruta) => navegaciones.push(ruta) } };
      if (name === '@/store/CatalogProvider') return { useCatalog: () => ({
        guardar: async (input, id) => { guardados.push({ input, id }); return id ?? 999; },
        supermercados: [{ id: 'lider', nombre: 'Líder' }, { id: 'unimarc', nombre: 'Unimarc' }],
      }) };
      if (name === '@/services/catalogo') return { mensajeErrorCatalogo: () => 'Error de guardado' };
      if (name === './ProductImage') return { default: 'ProductImage' };
      if (name.startsWith('@/')) return projectRequire('../' + name.slice(2));
      throw new Error('Importación inesperada: ' + name);
    },
  });
  const nodes = () => {
    hook = 0;
    const tree = exports.default({ producto });
    const result = [];
    function visit(n) {
      if (Array.isArray(n)) { n.forEach(visit); return; }
      if (!n?.props) return;
      result.push(n);
      visit(n.props.children);
    }
    visit(tree);
    return result;
  };
  function escribir(campo, texto) {
    const input = nodes().find((n) => n.type === 'TextInput' && n.props.accessibilityLabel === campo);
    assert.ok(input, 'Existe el input ' + campo);
    input.props.onChangeText(texto);
  }
  return {
    guardados, navegaciones,
    escribir,
    valor(campo) { return nodes().find((n) => n.type === 'TextInput' && n.props.accessibilityLabel === campo).props.value; },
    errores() { return nodes().filter((n) => n.props.accessibilityRole === 'alert').map((n) => [n.props.children].flat(Infinity).join('')).join('\n'); },
    async guardar() {
      const texto = (n) => typeof n === 'string' ? n : Array.isArray(n) ? n.map(texto).join('') : n?.props ? texto(n.props.children) : '';
      const button = nodes().find((n) => n.type === 'Pressable' && texto(n) === 'Guardar producto');
      assert.ok(button);
      button.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      const aviso = nodes().find((n) => n.props.accessibilityRole === 'alert')?.props.children ?? '';
      return Array.isArray(aviso) ? aviso.join('') : aviso;
    },
    completar() {
      for (const [campo, value] of Object.entries({
        Nombre: 'Producto válido', Detalles: 'Detalles del producto',
        'Tamaño o presentación': 'Caja', Contenido: '500',
        'Precio en Líder': '1500', 'Precio en Unimarc': '1700',
      })) escribir(campo, value);
    },
  };
}

const validos = (contenido = '500', lider = '1500', unimarc = '1700') => ({ contenido, lider, unimarc });

test('formato: convierte enteros y decimales con coma o punto sin alterar sus valores', () => {
  for (const [texto, esperado] of [['500', 500], ['1,5', 1.5], ['0.5', 0.5], ['0001.50', 1.5], ['0.0000001', 0.0000001]]) {
    const result = parsearCamposNumericos(validos(texto));
    assert.equal(result.valido, true);
    assert.equal(result.contenido, esperado);
    assert.deepEqual(result.precios, { lider: 1500, unimarc: 1700 });
  }
});

for (const campo of ['lider', 'unimarc']) {
  test('formato: rechaza precios mal escritos en ' + campo + ' antes de Number', () => {
    for (const texto of ['1e3', '1E3', '0x10', '0b10', '0o10', '1.000', '1,000', '1.5', '1,5', '+1', '-1', '1 500', ' 1500', '1500 ', '1500\n', 'NaN', 'Infinity', '   ']) {
      const result = parsearCamposNumericos({ ...validos(), [campo]: texto });
      assert.equal(result.valido, false, campo + ': ' + JSON.stringify(texto));
      assert.match(result.error, /solo dígitos/);
    }
  });
}

test('formato: rechaza contenido con exponentes, bases alternativas o separadores mezclados', () => {
  for (const texto of ['1e3', '1E-3', '0x10', '0b10', '0o10', '+1', '-1', '1,000.5', '1.000,5', '1..5', '1,,5', '1.', '1,', '.5', ',5', '1 500', ' 1.5', '1.5 ', '1.5\n', '', 'NaN', 'Infinity']) {
    const result = parsearCamposNumericos(validos(texto));
    assert.equal(result.valido, false, JSON.stringify(texto));
    assert.match(result.error, /contenido/);
  }
});

for (const campo of ['Precio en Líder', 'Precio en Unimarc']) {
  test('formulario real: formatos incorrectos de ' + campo + ' no llaman al guardado ni navegan', async () => {
    for (const texto of ['1e3', '0x10', '1.000', '1,000', '1.5', '+1500']) {
      const form = montarFormulario();
      form.completar();
      form.escribir(campo, texto);
      assert.match(await form.guardar(), /solo dígitos/);
      assert.equal(form.guardados.length, 0, texto);
      assert.equal(form.navegaciones.length, 0, texto);
    }
  });
}

test('formulario real: contenido con formato incorrecto no genera escrituras', async () => {
  for (const texto of ['0x10', '1e3', '1,000.5', '1..5', '1,']) {
    const form = montarFormulario();
    form.completar();
    form.escribir('Contenido', texto);
    assert.match(await form.guardar(), /contenido/i);
    assert.equal(form.guardados.length, 0);
    assert.equal(form.navegaciones.length, 0);
  }
});

test('formulario real: conserva las validaciones de rango después de comprobar el formato', async () => {
  for (const [campo, texto] of [['Contenido', '0'], ['Contenido', '50000.1'], ['Precio en Líder', '0'], ['Precio en Unimarc', '500001']]) {
    const form = montarFormulario();
    form.completar();
    form.escribir(campo, texto);
    assert.notEqual(await form.guardar(), '');
    assert.equal(form.guardados.length, 0);
    assert.equal(form.navegaciones.length, 0);
  }
});

test('formulario real: guarda coma y punto decimal como números y permite los límites superiores', async () => {
  for (const [texto, esperado] of [['1,5', 1.5], ['0.5', 0.5], ['50000', 50000]]) {
    const form = montarFormulario();
    form.completar();
    form.escribir('Contenido', texto);
    form.escribir('Precio en Líder', '500000');
    assert.equal(await form.guardar(), '');
    assert.equal(form.guardados.length, 1);
    assert.equal(form.guardados[0].input.contenido, esperado);
    assert.equal(form.guardados[0].input.precios.lider, 500000);
    assert.equal(form.navegaciones.length, 1);
  }
});

test('edición: muestra y conserva contenidos pequeños sin notación científica', async () => {
  for (const contenido of [0.0000001, 0.00000012, 0.0000000001]) {
    const form = montarFormulario({ ...productos[0], contenido });
    assert.doesNotMatch(form.valor('Contenido'), /e/i);
    assert.equal(await form.guardar(), '');
    assert.equal(form.guardados[0].input.contenido, contenido);
    assert.equal(form.guardados[0].id, 1);
  }
});

test('edición: un precio incorrecto tampoco se envía al actualizar un producto existente', async () => {
  const form = montarFormulario(productos[0]);
  form.escribir('Precio en Unimarc', '1.000');
  assert.match(await form.guardar(), /Unimarc/);
  assert.equal(form.guardados.length, 0);
  assert.equal(form.navegaciones.length, 0);
});

test('presentación: el contenido se expande como decimal y conserva valores enteros y fraccionarios', () => {
  for (const value of [1, 1.5, 100000, 0.00000012, 0.0000000001]) {
    const text = formatearContenido(value);
    assert.doesNotMatch(text, /e/i);
    assert.equal(Number(text), value);
  }
});

test('formulario: Jumbo y Santa Isabel son opcionales, pero sus precios escritos se validan igual', async () => {
  for (const campo of ['Precio en Jumbo', 'Precio en Santa Isabel']) {
    for (const invalido of ['1.000', '1e3', '0x10', '0', '1,5', ' ']) {
      const form = montarFormulario();
      form.completar();
      form.escribir(campo, invalido);
      assert.notEqual(await form.guardar(), '');
      assert.equal(form.guardados.length, 0);
    }
  }
  const form = montarFormulario();
  form.completar();
  form.escribir('Precio en Jumbo', '1200');
  form.escribir('Precio en Santa Isabel', '1300');
  assert.equal(await form.guardar(), '');
  assert.equal(form.guardados[0].input.precios.jumbo, 1200);
  assert.equal(form.guardados[0].input.precios.santaIsabel, 1300);
});

test('formulario: vaciar un precio opcional lo elimina, sin inventar cero ni conservar el anterior', async () => {
  const form = montarFormulario({ ...productos[0], precios: { ...productos[0].precios, jumbo: 800, santaIsabel: 900 } });
  form.escribir('Precio en Jumbo', '');
  assert.equal(await form.guardar(), '');
  assert.equal(Object.hasOwn(form.guardados[0].input.precios, 'jumbo'), false);
  assert.equal(form.guardados[0].input.precios.santaIsabel, 900);
});

test('formulario: registra un producto conocido solo en Jumbo y exige al menos un precio', async () => {
  const form = montarFormulario();
  form.completar();
  form.escribir('Precio en Líder', '');
  form.escribir('Precio en Unimarc', '');
  assert.match(await form.guardar(), /al menos un precio/);
  assert.equal(form.guardados.length, 0);
  form.escribir('Precio en Jumbo', '850');
  assert.equal(await form.guardar(), '');
  assert.deepEqual(JSON.parse(JSON.stringify(form.guardados[0].input.precios)), { jumbo: 850 });
});

test('formulario: rechaza textos inválidos sin escribir ni navegar al crear o editar', async () => {
  for (const producto of [undefined, productos[0]]) {
    for (const campo of ['Nombre', 'Detalles', 'Tamaño o presentación']) {
      for (const valor of ['!!!@@@', 'Arroz\u0000', 'Arroz\u200b']) {
        const form = montarFormulario(producto);
        form.completar();
        form.escribir(campo, valor);
        assert.notEqual(await form.guardar(), '');
        assert.equal(form.guardados.length, 0);
        assert.equal(form.navegaciones.length, 0);
      }
    }
  }
});

test('formulario: en edición aplica el límite de la unidad y rechaza unidades fraccionarias', async () => {
  for (const [unidad, invalido] of [['kg', '50.1'], ['L', '50.1'], ['g', '50000.1'], ['ml', '50000.1'], ['ud', '0,5'], ['ud', '1001']]) {
    const form = montarFormulario({ ...productos[0], unidad });
    form.escribir('Contenido', invalido);
    assert.notEqual(await form.guardar(), '');
    assert.equal(form.guardados.length, 0);
    assert.equal(form.navegaciones.length, 0);
  }
});

test('formulario: muestra el rechazo de caracteres especiales mientras se escribe', () => {
  for (const producto of [undefined, productos[0]]) {
    for (const campo of ['Nombre', 'Detalles', 'Tamaño o presentación']) {
      for (const signo of ['<', '>', '@', ',', '.', '-', '_']) {
        const form = montarFormulario(producto);
        form.escribir(campo, 'Producto' + signo);
        assert.match(form.errores(), /No se permiten caracteres especiales/);
        assert.equal(form.guardados.length, 0);
        form.escribir(campo, 'Piña orgánica 2');
        assert.equal(form.errores(), '');
      }
    }
  }
});

test('formulario: mantiene las marcas de prueba y las retira cuando se cambia el precio', async () => {
  const form = montarFormulario({ ...productos[0], precios: { lider: 990, jumbo: 1000, santaIsabel: 1000 }, preciosPrueba: ['jumbo', 'santaIsabel'] });
  form.escribir('Precio en Jumbo', '1250');
  assert.equal(await form.guardar(), '');
  assert.deepEqual(JSON.parse(JSON.stringify(form.guardados[0].input.preciosPrueba)), ['santaIsabel']);
  assert.equal(form.guardados[0].input.precios.jumbo, 1250);
});
