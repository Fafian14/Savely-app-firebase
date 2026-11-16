/**
 * OFERTAS DE DEMOSTRACIÓN: combina catálogo, lista y filtros.
 * Las distancias son constantes ficticias y hoy/semana son etiquetas; no se consulta GPS ni calendario.
 */
import type { Product, Supermercado } from "../models/Product";
import { compararPrecios } from "./product-comparison";
import { supermercadosIniciales } from "./supermarkets.store";

// Tiendas simuladas: Líder a 0,4 km y Unimarc a 1,1 km.
export const supermercados: { nombre: Supermercado; distancia?: number }[] = supermercadosIniciales;
// Los filtros pertenecen al estado local de LocalOffers; no se persisten con el catálogo.
export interface OfferFilters {
  radio: number;
  periodo: "hoy" | "semana";
  soloLista: boolean;
}
// Exige una oferta, un periodo compatible, pertenencia opcional a la lista y radio válido.
export function filtrarOfertas(
  productos: readonly Product[],
  lista: readonly number[],
  filtros: OfferFilters,
  tiendas: readonly { nombre: Supermercado; distancia?: number }[] = supermercados,
) {
  return productos.filter((p) => {
    const mejor = compararPrecios(p.precios);
    // Busca la tienda de menor precio. Un empate no tiene tienda ganadora y queda fuera del resultado.
    const tienda = tiendas.find(
      (s) => s.nombre === mejor.mejorSupermercado,
    );
    return (
      p.oferta !== "ninguna" &&
      (filtros.periodo === "semana" || p.oferta === "hoy") &&
      (!filtros.soloLista || lista.includes(p.id)) &&
      !!tienda &&
      // El radio se aplica a la tienda más barata; no busca una alternativa más cara dentro del radio.
      typeof tienda.distancia === "number" && tienda.distancia <= filtros.radio
    );
  });
}
// Suma diferencias individuales entre tiendas para los productos visibles.
// No mide descuentos históricos ni el ahorro frente a comprar todo en una única tienda.
export function ahorroOfertas(productos: readonly Product[]) {
  return productos.reduce(
    (total, p) => total + compararPrecios(p.precios).ahorro,
    0,
  );
}
