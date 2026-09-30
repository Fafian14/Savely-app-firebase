export type Categoria =
  "Alimentos" | "Bebidas" | "Limpieza" | "Higiene" | "Hogar";
export type Supermercado = "Líder" | "Unimarc";

export interface Precios {
  lider: number;
  unimarc: number;
}

export interface Product {
  id: number;
  nombre: string;
  descripcion: string;
  precios: Precios;
  imagen: string; // URL de la imagen del producto
  categoria: Categoria;
  contenido: number;
  unidad: "g" | "kg" | "ml" | "L" | "ud";
  tamano: string;
  oferta: "hoy" | "semana" | "ninguna";
}

export type ProductInput = Omit<Product, "id">;
