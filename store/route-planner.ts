import type { Product, Supermercado } from "../models/Product";
import type { Supermarket } from "../models/Supermarket";
import { supermercadosIniciales } from "./supermarkets.store";
import { precioMaximo } from "./catalog";

export interface ParadaRuta {
  tienda: Supermercado;
  productos: Product[];
  total: number;
}

// Una visita opcional no depende de que la tienda gane la comparación de precios.
export function obtenerParadas(
  tiendas: readonly Supermercado[],
  plan: { porTienda: Record<Supermercado, Product[]>; totales: Record<Supermercado, number> },
  visitarTodas: boolean,
): ParadaRuta[] {
  return tiendas.map((tienda) => ({ tienda, productos: plan.porTienda[tienda], total: plan.totales[tienda] }))
    .filter((parada) => visitarTodas || parada.productos.length > 0);
}

function validarTiendas(tiendas: readonly Supermercado[], disponibles: readonly Supermarket[]) {
  if (!tiendas.length) throw new Error("Selecciona al menos un supermercado para planificar.");
  if (new Set(tiendas).size !== tiendas.length || tiendas.some((nombre) => !disponibles.some((s) => s.nombre === nombre)))
    throw new Error("La selección de supermercados no es válida.");
}

// Usa los precios actuales del catálogo. El orden del recorrido no cambia los
// precios ni decide empates: en empate se conserva el orden estable de tiendas.
export function distribuirCompra(
  productos: readonly Product[],
  tiendas: readonly Supermercado[],
  disponibles: readonly Supermarket[] = supermercadosIniciales,
) {
  validarTiendas(tiendas, disponibles);
  const porTienda: Record<Supermercado, Product[]> = { Líder: [], Unimarc: [], Jumbo: [], "Santa Isabel": [] };
  const totales: Record<Supermercado, number> = { Líder: 0, Unimarc: 0, Jumbo: 0, "Santa Isabel": 0 };
  const totalPorTienda = { ...totales };
  const incompletas = new Set<Supermercado>();
  const sinPrecio: Product[] = [];
  const elegidas = disponibles.filter((s) => tiendas.includes(s.nombre));
  for (const producto of productos) {
    const conPrecio = elegidas.filter((tienda) => {
      const precio = producto.precios[tienda.id];
      if (precio === undefined) { incompletas.add(tienda.nombre); return false; }
      if (!Number.isSafeInteger(precio) || precio <= 0 || precio > precioMaximo)
        throw new Error(`El precio de ${producto.nombre} en ${tienda.nombre} no es válido.`);
      totalPorTienda[tienda.nombre] += precio;
      return true;
    });
    if (!conPrecio.length) { sinPrecio.push(producto); continue; }
    const mejor = conPrecio.reduce((ganadora, tienda) =>
      producto.precios[tienda.id]! < producto.precios[ganadora.id]! ? tienda : ganadora,
    );
    porTienda[mejor.nombre].push(producto);
    totales[mejor.nombre] += producto.precios[mejor.id]!;
  }
  const total = tiendas.reduce((suma, tienda) => suma + totales[tienda], 0);
  const completas = tiendas.filter((tienda) => !incompletas.has(tienda));
  const totalUnaTienda = completas.length ? Math.min(...completas.map((tienda) => totalPorTienda[tienda])) : null;
  return { porTienda, totales, total, totalUnaTienda, sinPrecio,
    ahorroVsTiendaUnica: !sinPrecio.length && totalUnaTienda !== null ? Math.max(0, totalUnaTienda - total) : 0 };

}

// Las flechas actúan sobre las paradas visibles, aunque haya tiendas elegidas
// sin productos. No muta el orden anterior ni altera la selección.
export function reordenarParadas(
  tiendas: readonly Supermercado[],
  visibles: readonly Supermercado[],
  indice: number,
  direccion: -1 | 1,
): Supermercado[] {
  const orden = [...tiendas];
  const destino = indice + direccion;
  if (!Number.isInteger(indice) || indice < 0 || indice >= visibles.length || destino < 0 || destino >= visibles.length)
    return orden;
  const a = orden.indexOf(visibles[indice]);
  const b = orden.indexOf(visibles[destino]);
  if (a < 0 || b < 0) return orden;
  [orden[a], orden[b]] = [orden[b], orden[a]];
  return orden;
}

export type ModoViaje = "walking" | "driving" | "bicycling";
export interface UbicacionesRuta {
  origen: string;
  sucursales: Partial<Record<Supermercado, string>>;
  modo: ModoViaje;
}

// Admite una dirección con localidad o un punto de coordenadas concreto. No
// geocodifica ni sustituye una sucursal desconocida por el nombre de la cadena.
export function validarUbicacion(texto: string): string | null {
  const valor = texto.trim();
  if (valor.length === 0 || valor.length > 200 || /[\u0000-\u001f]/.test(valor))
    return "Escribe una dirección completa o coordenadas de hasta 200 caracteres.";
  if (/(^|,)\s*[+-]?(?:NaN|Infinity)\s*(,|$)/i.test(valor)) return "Las coordenadas deben ser números finitos.";
  if (/^[+\-0-9.,\s]+$/.test(valor)) {
    const partes = /^(-?[0-9]+(?:\.[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]+)?)$/.exec(valor);
    if (!partes || Math.abs(Number(partes[1])) > 90 || Math.abs(Number(partes[2])) > 180)
      return "Usa coordenadas válidas: latitud,longitud, por ejemplo -36.82,-73.05.";
    return null;
  }
  if (valor.length < 8 || !/\p{L}/u.test(valor) || !valor.includes(",") || valor.split(",").filter((p) => p.trim()).length < 2 || valor.split(",").some((p) => !p.trim()) || /^https?:/i.test(valor))
    return "Incluye la dirección y la ciudad separadas por coma, o pega las coordenadas del punto exacto.";
  return null;
}

export function crearEnlaceGoogleMaps(
  origen: string, paradas: readonly Supermercado[],
  sucursales: Partial<Record<Supermercado, string>> = {}, modo: ModoViaje = "walking",
) {
  const errorOrigen = validarUbicacion(origen);
  if (errorOrigen) throw new Error("Origen: " + errorOrigen);
  validarTiendas(paradas, supermercadosIniciales);
  if (!["walking", "driving", "bicycling"].includes(modo)) throw new Error("El medio de transporte no es válido.");
  const destinos = paradas.map((tienda) => {
    const direccion = sucursales[tienda] ?? "";
    const error = validarUbicacion(direccion);
    if (error) throw new Error(`Sucursal ${tienda}: ${error}`);
    return direccion.trim();
  });
  if (new Set(destinos).size !== destinos.length) throw new Error("Dos paradas tienen la misma ubicación. Revisa las sucursales.");
  const parametros: Record<string, string> = {
    api: "1", origin: origen.trim(), destination: destinos[destinos.length - 1], travelmode: modo,
  };
  if (destinos.length > 1) parametros.waypoints = destinos.slice(0, -1).join("|");
  const url = "https://www.google.com/maps/dir/?" + Object.entries(parametros)
    .map(([clave, valor]) => `${clave}=${encodeURIComponent(valor)}`).join("&");
  if (url.length > 2048) throw new Error("Las direcciones son demasiado largas. Usa coordenadas para acortarlas.");
  return url;
}
