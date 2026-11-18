import assert from "node:assert/strict";
import test from "node:test";
import { calcularPreciosComparacion } from "./comparison-prices";
import { productos } from "./products.store";

test("precios de comparación: preserva los valores registrados y solo ajusta los identificados", () => {
  const p = { ...productos[0], precios: { lider: 990, unimarc: 1090, jumbo: 1000, santaIsabel: 1000 }, preciosPrueba: ["jumbo", "santaIsabel"] as ("jumbo" | "santaIsabel")[] };
  const resultado = calcularPreciosComparacion(p);
  assert.deepEqual(resultado, { lider: 990, unimarc: 1090, jumbo: 980, santaIsabel: 1080 });
  assert.equal(p.precios.jumbo, 1000);
  assert.deepEqual(calcularPreciosComparacion({ ...p, precios: resultado }), resultado);
});

test("precios de comparación: deja intactos productos sin marcas y precios desconocidos", () => {
  const p = { ...productos[0], precios: { lider: 1500 } };
  assert.deepEqual(calcularPreciosComparacion(p), { lider: 1500 });
});

test("precios de comparación: no inventa una referencia cuando todos son provisionales", () => {
  assert.throws(() => calcularPreciosComparacion({ ...productos[0], precios: { jumbo: 1000 }, preciosPrueba: ["jumbo"] }), /referencia/);
});

test("precios de comparación: mantiene enteros positivos dentro del máximo y variaciones acotadas", () => {
  for (const id of [1, 2, 3]) for (const referencia of [1, 50, 990, 15000, 500000]) {
    const r = calcularPreciosComparacion({ ...productos[0], id, precios: { lider: referencia, jumbo: 1000, santaIsabel: 1000 }, preciosPrueba: ["jumbo", "santaIsabel"] });
    assert.equal(r.lider, referencia);
    for (const precio of [r.jumbo!, r.santaIsabel!]) {
      assert.ok(Number.isSafeInteger(precio) && precio > 0 && precio <= 500000);
      assert.ok(Math.abs(precio - referencia) <= referencia * 0.07 + 5);
    }
  }
});
