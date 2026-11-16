/**
 * MODELO ACTUAL: contratos de datos del catálogo de Savely.
 * Los tipos ayudan durante el desarrollo; no validan por sí solos el JSON leído del almacenamiento.
 */
// Unión de literales: solo permite las cinco categorías definidas.
export type Categoria =
  "Alimentos" | "Bebidas" | "Limpieza" | "Higiene" | "Hogar";
// Tiendas soportadas; la clave identifica el precio registrado en Firestore.
export const supermercados = [
  { nombre: "Líder", clave: "lider" },
  { nombre: "Unimarc", clave: "unimarc" },
  { nombre: "Jumbo", clave: "jumbo" },
  { nombre: "Santa Isabel", clave: "santaIsabel" },
] as const;
export type Supermercado = (typeof supermercados)[number]["nombre"];
export type ClavePrecio = (typeof supermercados)[number]["clave"];

// Los precios registrados se expresan en CLP para el mismo contenido. Ausente significa desconocido.
export interface Precios {
  lider?: number;
  unimarc?: number;
  // Ausente significa desconocido; nunca se inventa ni se interpreta como cero.
  jumbo?: number;
  santaIsabel?: number;
}

// Cada clave identifica un PNG local transparente incluido por Metro.
export type ImagenProducto =
  "leche" | "manzana" | "platano" | "arroz" | "detergente" | "bebida" |
  "fideos" | "huevos" | "agua" | "jugo" | "lavalozas" | "limpiador" |
  "champu" | "jabon" | "pasta-dental" | "papel-absorbente" | "bolsas-basura" | "esponjas";

// Estructura completa: identidad, descripción, categoría, precios, contenido y oferta.
export interface Product {
  id: number;
  nombre: string;
  descripcion: string;
  precios: Precios;
  imagen: ImagenProducto;
  categoria: Categoria;
  // Cantidad del envase. Se combina con unidad para calcular el precio por kg, L o unidad.
  contenido: number;
  unidad: "g" | "kg" | "ml" | "L" | "ud";
  tamano: string;
  // Etiquetas de demostración; no son fechas calculadas con el calendario.
  oferta: "hoy" | "semana" | "ninguna";
}

// El ID se asigna al guardar. La imagen puede elegirse o inferirse del nombre y categoría.
export type ProductInput = Omit<Product, "id" | "imagen"> & { imagen?: ImagenProducto };
