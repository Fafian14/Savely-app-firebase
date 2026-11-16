import type { Precios, Supermercado } from "./Product";

// Las claves vinculan cada supermercado con su precio dentro del producto.
export interface Supermarket {
  id: keyof Precios;
  nombre: Supermercado;
  moneda: "CLP";
  distancia?: number;
}
