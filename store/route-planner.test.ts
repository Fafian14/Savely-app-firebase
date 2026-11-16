import assert from "node:assert/strict";
import test from "node:test";
import { productos } from "./products.store";
import {
  crearEnlaceGoogleMaps,
  distribuirCompra,
  reordenarParadas,
} from "./route-planner";
import { supermercadosIniciales } from "./supermarkets.store";
import type { Supermercado } from "../models/Product";
const sucursales = { "Líder": "Calle Uno 100, Concepción, Chile", "Unimarc": "Calle Dos 200, Concepción, Chile" };

test("reparte la lista según el mejor precio y calcula el ahorro de la ruta", () => {
  const seleccionados = productos.filter((producto) =>
    [1, 3, 4, 5].includes(producto.id),
  );
  const plan = distribuirCompra(seleccionados, ["Líder", "Unimarc"]);

  assert.deepEqual(
    plan.porTienda["Líder"].map((producto) => producto.id),
    [1],
  );
  assert.deepEqual(
    plan.porTienda.Unimarc.map((producto) => producto.id),
    [3, 4, 5],
  );
  assert.deepEqual(plan.totales, { Líder: 990, Unimarc: 6570, Jumbo: 0, "Santa Isabel": 0 });
  assert.equal(plan.total, 7560);
  assert.equal(plan.ahorroVsTiendaUnica, 100);
});

test("una sola tienda recibe todos los productos y empates favorecen a Líder", () => {
  const seleccionados = productos.filter((producto) =>
    [1, 2].includes(producto.id),
  );
  const unimarc = distribuirCompra(seleccionados, ["Unimarc"]);
  const empate = {
    ...productos[0],
    precios: { lider: 990, unimarc: 990 },
  };
  const lider = distribuirCompra([empate], ["Líder", "Unimarc"]);

  assert.equal(unimarc.porTienda.Unimarc.length, 2);
  assert.equal(unimarc.porTienda["Líder"].length, 0);
  assert.equal(unimarc.ahorroVsTiendaUnica, 0);
  assert.equal(lider.porTienda["Líder"].length, 1);
  assert.equal(lider.porTienda.Unimarc.length, 0);
});

test("no asigna productos ni suma cuando la lista está vacía", () => {
  const plan = distribuirCompra([], ["Líder", "Unimarc"]);

  assert.deepEqual(plan.porTienda, { Líder: [], Unimarc: [], Jumbo: [], "Santa Isabel": [] });
  assert.deepEqual(plan.totales, { Líder: 0, Unimarc: 0, Jumbo: 0, "Santa Isabel": 0 });
  assert.equal(plan.total, 0);
  assert.equal(plan.ahorroVsTiendaUnica, 0);
});

test("Google Maps recibe el origen, el orden de paradas y el modo a pie", () => {
  const url = new URL(
    crearEnlaceGoogleMaps("Centro de Concepción, Biobío, Chile", [
      "Unimarc",
      "Líder",
    ], sucursales),
  );

  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/dir/");
  assert.equal(url.searchParams.get("origin"), "Centro de Concepción, Biobío, Chile");
  assert.equal(
    url.searchParams.get("destination"),
    sucursales["Líder"],
  );
  assert.equal(
    url.searchParams.get("waypoints"),
    sucursales.Unimarc,
  );
  assert.equal(url.searchParams.get("travelmode"), "walking");
});

test("no crea una ruta de Google Maps sin paradas", () => {
  assert.throws(() => crearEnlaceGoogleMaps("Concepción", []));
});

// Casos de integración con el modelo y los precios actuales de Firebase.

test("los nuevos precios recibidos del catálogo cambian la distribución", () => {
  const producto = { ...productos[0], precios: { lider: 1200, unimarc: 800 } };
  const plan = distribuirCompra([producto], ["Líder", "Unimarc"], supermercadosIniciales);
  assert.deepEqual(plan.porTienda.Unimarc.map((p) => p.id), [1]);
  assert.equal(plan.total, 800);
  assert.equal(plan.ahorroVsTiendaUnica, 0);
});

test("el orden de las paradas no cambia el total, el ahorro ni los empates", () => {
  const empate = { ...productos[0], precios: { lider: 1000, unimarc: 1000 } };
  const antes = distribuirCompra([empate, productos[2]], ["Líder", "Unimarc"]);
  const despues = distribuirCompra([empate, productos[2]], ["Unimarc", "Líder"]);
  assert.deepEqual(antes, despues);
});

test("no permite seleccionar cero tiendas, tiendas repetidas ni tiendas sin precios registrados", () => {
  assert.throws(() => distribuirCompra(productos, []), /al menos/);
  assert.throws(() => distribuirCompra(productos, ["Líder", "Líder"]), /válida/);
  assert.throws(() => distribuirCompra(productos, ["Desconocido" as Supermercado]), /válida/);
});

test("rechaza precios inválidos antes de recomendar una parada", () => {
  for (const precio of [0, -1, 1.5, NaN, Infinity, 100000001]) {
    const producto = { ...productos[0], precios: { lider: precio, unimarc: 1000 } };
    assert.throws(() => distribuirCompra([producto], ["Líder", "Unimarc"]), /no es válido/);
  }
});

test("reordena paradas sin mutar la selección ni perder supermercados", () => {
  const tiendas: Supermercado[] = ["Líder", "Unimarc"];
  const resultado = reordenarParadas(tiendas, tiendas, 0, 1);
  assert.deepEqual(resultado, ["Unimarc", "Líder"]);
  assert.deepEqual(tiendas, ["Líder", "Unimarc"]);
  assert.deepEqual(reordenarParadas(resultado, resultado, 1, -1), tiendas);
});

test("no mueve paradas fuera de los límites ni confunde tiendas sin productos", () => {
  const tiendas: Supermercado[] = ["Líder", "Unimarc"];
  assert.deepEqual(reordenarParadas(tiendas, tiendas, 0, -1), tiendas);
  assert.deepEqual(reordenarParadas(tiendas, tiendas, 1, 1), tiendas);
  assert.deepEqual(reordenarParadas(tiendas, ["Unimarc"], 0, 1), tiendas);
  assert.deepEqual(reordenarParadas(tiendas, tiendas, -1, 1), tiendas);
});

test("Google Maps con una sola parada omite waypoints y codifica el origen", () => {
  const origen = "Concepción & Biobío, Chile";
  const url = new URL(crearEnlaceGoogleMaps(origen, ["Unimarc"], sucursales));
  assert.equal(url.searchParams.get("origin"), origen);
  assert.equal(url.searchParams.get("waypoints"), null);
  assert.equal(url.searchParams.get("destination"), sucursales.Unimarc);
  assert.equal(url.searchParams.get("api"), "1");
});

test("Google Maps rechaza orígenes vacíos y listas de paradas inconsistentes", () => {
  assert.throws(() => crearEnlaceGoogleMaps("  ", ["Líder"]), /Origen/);
  assert.throws(() => crearEnlaceGoogleMaps("Calle 1, Concepción", ["Líder", "Líder"], sucursales), /válida/);
  assert.throws(() => crearEnlaceGoogleMaps("Calle 1, Concepción", ["Desconocido" as Supermercado], sucursales), /válida/);
});

test("cuatro tiendas: distribuye solo precios existentes y detecta productos que faltan", () => {
  const a = { ...productos[0], precios: { lider: 1000, unimarc: 1200, jumbo: 800 } };
  const b = { ...productos[1], precios: { lider: 2000, unimarc: 2100, santaIsabel: 1900 } };
  const todas = distribuirCompra([a, b], ["Líder", "Unimarc", "Jumbo", "Santa Isabel"]);
  assert.equal(todas.total, 2700);
  assert.equal(todas.sinPrecio.length, 0);
  assert.equal(todas.ahorroVsTiendaUnica, 300);
  const incompleta = distribuirCompra([a, b], ["Jumbo"]);
  assert.equal(incompleta.sinPrecio.length, 1);
  assert.equal(incompleta.totalUnaTienda, null);
  assert.equal(incompleta.ahorroVsTiendaUnica, 0);
});

test("Maps: usa sucursales exactas en cuatro paradas y respeta el transporte", () => {
  const destinos = { Líder: "-36.82,-73.05", Unimarc: "-36.83,-73.06", Jumbo: "-36.84,-73.07", "Santa Isabel": "-36.85,-73.08" };
  const url = new URL(crearEnlaceGoogleMaps("0,0", ["Jumbo", "Líder", "Unimarc", "Santa Isabel"], destinos, "driving"));
  assert.equal(url.searchParams.get("origin"), "0,0");
  assert.equal(url.searchParams.get("destination"), destinos["Santa Isabel"]);
  assert.equal(url.searchParams.get("waypoints"), [destinos.Jumbo, destinos.Líder, destinos.Unimarc].join("|"));
  assert.equal(url.searchParams.get("travelmode"), "driving");
});

test("Maps: rechaza coordenadas inválidas, cadenas genéricas y sucursales sin configurar", () => {
  for (const origen of ["Líder", "91,0", "0,181", "NaN,0", "Infinity,0", "0,-Infinity", "Calle 1,,Santiago", "Calle sin localidad", "", "-36.8,-73.1\nX"]) {
    assert.throws(() => crearEnlaceGoogleMaps(origen, ["Líder"], sucursales));
  }
  assert.throws(() => crearEnlaceGoogleMaps("Calle 1, Santiago", ["Jumbo"]), /Sucursal Jumbo/);
  assert.throws(() => crearEnlaceGoogleMaps("Calle 1, Santiago", ["Líder", "Unimarc"], { Líder: "0,0", Unimarc: "0,0" }), /misma ubicación/);
});
