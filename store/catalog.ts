/**
 * LÓGICA DEL CATÁLOGO: funciones sin interfaz ni acceso directo a AsyncStorage.
 * Validan y transforman datos creando nuevos objetos; el provider se encarga de persistirlos.
 */
import { supermercados, type Product, type ProductInput } from "../models/Product";
import { categorias } from "./products.store";
import { elegirImagen, esImagenProducto } from "./product-images";
import { validarCaracteresCampo } from "./input-validation";

// as const conserva los valores literales de las unidades permitidas.
export const unidades = ["g", "kg", "ml", "L", "ud"] as const;
export const ofertas = ["hoy", "semana", "ninguna"] as const;
// Límites de negocio para presentaciones de supermercado, no valores físicos universales.
export const limitesContenido = { g: 50000, kg: 50, ml: 50000, L: 50, ud: 1000 } as const;
export const precioMaximo = 500000;

function validarTexto(valor: string, campo: string, maximo: number, multilinea = false, textoHistorico = false): string | null {
  if (typeof valor !== "string" || !valor.trim() || valor.length > maximo)
    return `${campo}: escribe un texto de hasta ${maximo} caracteres.`;
  // Solo los detalles admiten saltos de línea. No elimina silenciosamente texto inválido.
  const comprobable = multilinea ? valor.replace(/\r\n|[\r\n]/g, "") : valor;
  if (/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(comprobable))
    return `${campo}: no se permiten caracteres de control o invisibles.`;
  if (!/[\p{L}\p{N}]/u.test(valor))
    return `${campo}: incluye al menos una letra o un número.`;
  if (!textoHistorico && validarCaracteresCampo(valor, "texto"))
    return `${campo}: No se permiten caracteres especiales.`;
  return null;
}
// Estado persistido: catálogo, IDs de la lista y contador del próximo ID.
export interface CatalogState {
  productos: Product[];
  lista: number[];
  siguienteId: number;
  // Migra la antigua manzana compartida una sola vez sin perder productos ni lista.
  versionImagenes?: 1;
}

// Devuelve el primer mensaje de error o null si todo es válido.
// Esta comprobación se usa en el formulario, el guardado y la lectura del JSON.
export function validarProducto(p: ProductInput, textoHistorico = false): string | null {
  if (p.preciosPrueba !== undefined && (!Array.isArray(p.preciosPrueba) ||
      new Set(p.preciosPrueba).size !== p.preciosPrueba.length ||
      p.preciosPrueba.some((clave) => !supermercados.some((s) => s.clave === clave) || p.precios?.[clave] === undefined)))
    return "La identificación de precios de prueba no es válida.";
  if (p.imagen !== undefined && !esImagenProducto(p.imagen))
    return "Selecciona una imagen válida del catálogo.";
  const errorNombre = validarTexto(p.nombre, "Nombre", 100, false, textoHistorico);
  if (errorNombre) return errorNombre;
  if (!categorias.includes(p.categoria))
    return "Selecciona una categoría válida.";
  const errorDescripcion = validarTexto(p.descripcion, "Detalles", 1000, true, textoHistorico);
  if (errorDescripcion) return errorDescripcion;
  const errorTamano = validarTexto(p.tamano, "Tamaño o presentación", 80, false, textoHistorico);
  if (errorTamano) return errorTamano;
  if (!unidades.includes(p.unidad)) return "Selecciona una unidad válida.";
  if (!Number.isFinite(p.contenido) || p.contenido <= 0 || p.contenido > limitesContenido[p.unidad])
    return `El contenido debe ser mayor que cero y no superar ${limitesContenido[p.unidad]} ${p.unidad}.`;
  if (p.unidad === "ud" && !Number.isSafeInteger(p.contenido))
    return "El contenido en ud debe ser un número entero, sin fracciones.";
  if (!ofertas.includes(p.oferta))
    return "Selecciona la disponibilidad de la oferta.";
  // Los precios deben ser enteros seguros, positivos y dentro del límite; un teclado numérico no basta.
  if (
    !p.precios || typeof p.precios !== "object" || Array.isArray(p.precios) ||
    Object.keys(p.precios).some((clave) => !["lider", "unimarc", "jumbo", "santaIsabel"].includes(clave)) ||
    Object.values(p.precios).filter((v) => v !== undefined).length === 0 ||
    !Object.values(p.precios).filter((v) => v !== undefined).every(
      (v) => Number.isSafeInteger(v) && v > 0 && v <= precioMaximo,
    )
  )
    return "Registra al menos un precio en pesos enteros, entre $1 y $500.000.";
  return null;
}

// Sin id crea un producto; con id actualiza uno existente.
// Valida otra vez para que la regla no dependa únicamente de la pantalla del formulario.
export function guardarProducto(
  state: CatalogState,
  input: ProductInput,
  id?: number,
): CatalogState {
  const error = validarProducto(input);
  if (error) throw new Error(error);
  if (id !== undefined && !state.productos.some((p) => p.id === id))
    throw new Error("Este producto ya no existe.");
  // Recorta espacios y asigna la imagen elegida o una sugerencia por nombre y categoría.
  const producto: Product = {
    ...input,
    precios: {
      ...(input.precios.lider !== undefined ? { lider: input.precios.lider } : {}),
      ...(input.precios.unimarc !== undefined ? { unimarc: input.precios.unimarc } : {}),
      ...(input.precios.jumbo !== undefined ? { jumbo: input.precios.jumbo } : {}),
      ...(input.precios.santaIsabel !== undefined ? { santaIsabel: input.precios.santaIsabel } : {}),
    },
    nombre: input.nombre.trim(),
    descripcion: input.descripcion.trim(),
    tamano: input.tamano.trim(),
    id: id ?? state.siguienteId,
    imagen: input.imagen ?? elegirImagen(input.nombre, input.categoria),
  };
  return {
    ...state,
    versionImagenes: 1,
    // Inmutabilidad: spread agrega un producto y map reemplaza el editado sin mutar el arreglo previo.
    productos:
      id === undefined
        ? [...state.productos, producto]
        : state.productos.map((p) => (p.id === id ? producto : p)),
    siguienteId: id === undefined ? state.siguienteId + 1 : state.siguienteId,
  };
}

// filter elimina el producto y su referencia en la lista; evita IDs que apunten a productos borrados.
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

// JSON.parse puede fallar. El valor se trata como unknown hasta revisar su estructura.
export function leerCatalogo(texto: string): CatalogState {
  const data: unknown = JSON.parse(texto);
  if (!data || typeof data !== "object") throw new Error("Catálogo no válido.");
  // Esta aserción permite acceder a campos, pero NO prueba que sean válidos: las comprobaciones siguen abajo.
  const s = data as CatalogState;
  if (
    !Array.isArray(s.productos) ||
    !Array.isArray(s.lista) ||
    !Number.isSafeInteger(s.siguienteId)
  )
    throw new Error("Catálogo no válido.");
  // Valida cada producto recuperado, incluidos su ID, textos, imagen y precios.
  for (const p of s.productos) {
    if (
      !p ||
      typeof p.nombre !== "string" ||
      typeof p.descripcion !== "string" ||
      typeof p.tamano !== "string" ||
      !p.precios ||
      !esImagenProducto(p.imagen) ||
      !Number.isSafeInteger(p.id) ||
      p.id < 1 ||
      validarProducto(p, true)
    )
      throw new Error("Producto guardado no válido.");
  }
  if (
    // Set detecta IDs repetidos; siguienteId debe superar todos los IDs existentes.
    new Set(s.productos.map((p) => p.id)).size !== s.productos.length ||
    s.siguienteId <= Math.max(0, ...s.productos.map((p) => p.id))
  )
    throw new Error("IDs de catálogo no válidos.");
  if (
    // Cada ID de la lista debe existir en el catálogo; también se rechazan duplicados.
    !s.lista.every(
      (id) => Number.isSafeInteger(id) && s.productos.some((p) => p.id === id),
    ) ||
    new Set(s.lista).size !== s.lista.length
  )
    throw new Error("Lista no válida.");
  if (s.versionImagenes !== undefined && s.versionImagenes !== 1)
    throw new Error("Versión de imágenes no válida.");
  // Los catálogos previos usaban manzana para todos; solo se transforma ese campo.
  if (s.versionImagenes !== 1) {
    return {
      ...s,
      versionImagenes: 1,
      productos: s.productos.map((p) => ({
        ...p,
        imagen: p.imagen === "manzana" ? elegirImagen(p.nombre, p.categoria) : p.imagen,
      })),
    };
  }
  return s;
}
