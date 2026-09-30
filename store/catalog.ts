import type { Product, ProductInput } from "../models/Product";
import { categorias } from "./products.store";

export const unidades = ["g", "kg", "ml", "L", "ud"] as const;
export const ofertas = ["hoy", "semana", "ninguna"] as const;
export interface CatalogState {
  productos: Product[];
  lista: number[];
  siguienteId: number;
}

export function validarProducto(p: ProductInput): string | null {
  if (!p.nombre.trim() || p.nombre.length > 100)
    return "Escribe un nombre de hasta 100 caracteres.";
  if (!categorias.includes(p.categoria))
    return "Selecciona una categoría válida.";
  if (!p.descripcion.trim() || p.descripcion.length > 1000)
    return "Escribe los detalles (máximo 1000 caracteres).";
  if (!p.tamano.trim() || p.tamano.length > 80)
    return "Escribe el tamaño o presentación (máximo 80 caracteres).";
  if (!p.imagen?.trim()) return "Ingresa la URL de la imagen del producto.";
  try {
    const url = new URL(p.imagen.trim());
    if (!/^https?:$/.test(url.protocol)) throw new Error();
  } catch {
    return "Ingresa una URL válida para la imagen (http o https).";
  }
  if (!Number.isFinite(p.contenido) || p.contenido <= 0 || p.contenido > 100000)
    return "El contenido debe ser mayor que cero y no superar 100.000.";
  if (!unidades.includes(p.unidad)) return "Selecciona una unidad válida.";
  if (!ofertas.includes(p.oferta))
    return "Selecciona la disponibilidad de la oferta.";
  if (
    ![p.precios.lider, p.precios.unimarc].every(
      (v) => Number.isSafeInteger(v) && v > 0 && v <= 100000000,
    )
  )
    return "Los precios deben ser pesos enteros, entre $1 y $100.000.000.";
  return null;
}

export function guardarProducto(
  state: CatalogState,
  input: ProductInput,
  id?: number,
): CatalogState {
  const error = validarProducto(input);
  if (error) throw new Error(error);
  if (id !== undefined && !state.productos.some((p) => p.id === id))
    throw new Error("Este producto ya no existe.");
  const producto: Product = {
    ...input,
    nombre: input.nombre.trim(),
    descripcion: input.descripcion.trim(),
    tamano: input.tamano.trim(),
    id: id ?? state.siguienteId,
    imagen: input.imagen.trim(),
  };
  return {
    ...state,
    productos:
      id === undefined
        ? [...state.productos, producto]
        : state.productos.map((p) => (p.id === id ? producto : p)),
    siguienteId: id === undefined ? state.siguienteId + 1 : state.siguienteId,
  };
}

export function eliminarProducto(
  state: CatalogState,
  id: number,
): CatalogState {
  return {
    ...state,
    productos: state.productos.filter((p) => p.id !== id),
    lista: state.lista.filter((item) => item !== id),
  };
}

export function leerCatalogo(texto: string): CatalogState {
  const data: unknown = JSON.parse(texto);
  if (!data || typeof data !== "object") throw new Error("Catálogo no válido.");
  const s = data as CatalogState;
  // Compatibilidad con catálogos antiguos que usaban la palabra "manzana"
  // como identificador de una imagen local.
  const imagenAntigua =
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800";
  s.productos = s.productos.map((p) =>
    p && p.imagen === "manzana" ? { ...p, imagen: imagenAntigua } : p,
  );
  if (
    !Array.isArray(s.productos) ||
    !Array.isArray(s.lista) ||
    !Number.isSafeInteger(s.siguienteId)
  )
    throw new Error("Catálogo no válido.");
  for (const p of s.productos) {
    if (
      !p ||
      typeof p.nombre !== "string" ||
      typeof p.descripcion !== "string" ||
      typeof p.tamano !== "string" ||
      !p.precios ||
      typeof p.imagen !== "string" ||
      !Number.isSafeInteger(p.id) ||
      p.id < 1 ||
      validarProducto(p)
    )
      throw new Error("Producto guardado no válido.");
  }
  if (
    new Set(s.productos.map((p) => p.id)).size !== s.productos.length ||
    s.siguienteId <= Math.max(0, ...s.productos.map((p) => p.id))
  )
    throw new Error("IDs de catálogo no válidos.");
  if (
    !s.lista.every(
      (id) => Number.isSafeInteger(id) && s.productos.some((p) => p.id === id),
    ) ||
    new Set(s.lista).size !== s.lista.length
  )
    throw new Error("Lista no válida.");
  return s;
}
