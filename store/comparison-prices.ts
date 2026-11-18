import { supermercados, type Precios, type Product } from "../models/Product";
import { precioMaximo } from "./catalog";

// Valores de comparación calculados, no una consulta de precios de mercado.
// Solo sustituye los valores provisionales identificados en el documento.
export function calcularPreciosComparacion(producto: Product): Precios {
  const pendientes = producto.preciosPrueba ?? [];
  const precios = { ...producto.precios };
  if (!pendientes.length) return precios;
  const referencias = supermercados
    .filter((s) => !pendientes.includes(s.clave))
    .map((s) => precios[s.clave])
    .filter((p): p is number => typeof p === "number" && Number.isSafeInteger(p) && p > 0 && p <= precioMaximo);
  if (!referencias.length) throw new Error(`El producto ${producto.id} no tiene precios de referencia.`);
  if (!Number.isSafeInteger(producto.id) || producto.id < 1) throw new Error("El ID del producto no es válido.");
  const referencia = referencias.reduce((suma, p) => suma + p, 0) / referencias.length;
  const indice = (producto.id - 1) % 3;
  const factores = {
    lider: [0.97, 1.03, 1.01], unimarc: [1.02, 0.96, 1.04],
    jumbo: [0.94, 1.02, 1.06], santaIsabel: [1.04, 0.95, 1.00],
  } as const;
  const paso = referencia >= 100 ? 10 : 1;
  for (const clave of pendientes) {
    if (!supermercados.some((s) => s.clave === clave)) throw new Error("Supermercado no válido.");
    precios[clave] = Math.min(precioMaximo, Math.max(1, Math.round(referencia * factores[clave][indice] / paso) * paso));
  }
  return precios;
}
