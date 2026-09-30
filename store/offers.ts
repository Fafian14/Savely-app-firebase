import type { Product, Supermercado } from "../models/Product";
import { compararPrecios } from "./product-comparison";

export const supermercados: { nombre: Supermercado; distancia: number }[] = [
  { nombre: "Líder", distancia: 0.4 },
  { nombre: "Unimarc", distancia: 1.1 },
];
export interface OfferFilters {
  radio: number;
  periodo: "hoy" | "semana";
  soloLista: boolean;
}
export function filtrarOfertas(
  productos: readonly Product[],
  lista: readonly number[],
  filtros: OfferFilters,
) {
  return productos.filter((p) => {
    const mejor = compararPrecios(p.precios);
    const tienda = supermercados.find(
      (s) => s.nombre === mejor.mejorSupermercado,
    );
    return (
      p.oferta !== "ninguna" &&
      (filtros.periodo === "semana" || p.oferta === "hoy") &&
      (!filtros.soloLista || lista.includes(p.id)) &&
      !!tienda &&
      tienda.distancia <= filtros.radio
    );
  });
}
export function ahorroOfertas(productos: readonly Product[]) {
  return productos.reduce(
    (total, p) => total + compararPrecios(p.precios).ahorro,
    0,
  );
}
