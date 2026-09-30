// Definimos la estructura TypeScript para los precios de cada supermercado
export interface SupermercadoPrecio {
  id: string; // Identificador único de la oferta/precio
  nombreSupermercado: 'Lider' | 'Jumbo' | 'Tottus' | 'Unimarc'; // Nombre de la cadena
  precio: number; // Precio normal en CLP
  precioOferta?: number; // Precio en oferta (opcional)
}

// Clase orientada a objetos para la entidad Producto
export class Producto {
  id: number; // ID único del producto
  titulo: string; // Nombre del producto (ej: "Leche Entera")
  detalle: string; // Descripción detallada
  rutaImagen: string; // URL de la imagen del producto
  precios: SupermercadoPrecio[]; // Listado de precios por supermercado

  constructor(
    id: number,
    titulo: string,
    detalle: string,
    rutaImagen: string,
    precios: SupermercadoPrecio[] = [] // Si no se pasan precios, por defecto inicia como lista vacía
  ) {
    this.id = id;
    this.titulo = titulo;
    this.detalle = detalle;
    this.rutaImagen = rutaImagen;
    this.precios = precios;
  }
}