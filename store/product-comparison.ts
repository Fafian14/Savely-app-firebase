import type {
  Categoria,
  Precios,
  Product,
  Supermercado,
} from "../models/Product";

export function formatearPesos(valor: number): string {
  return "$" + Math.round(valor).toLocaleString("es-CL");
}

export function compararPrecios(precios: Precios) {
  const mejorSupermercado: Supermercado | null =
    precios.lider === precios.unimarc
      ? null
      : precios.lider < precios.unimarc
        ? "Líder"
        : "Unimarc";

  return {
    mejorSupermercado,
    precioMenor: Math.min(precios.lider, precios.unimarc),
    ahorro: Math.abs(precios.lider - precios.unimarc),
  };
}

export function sumarPrecios(productos: readonly Product[]): Precios {
  return productos.reduce(
    (total, producto) => ({
      lider: total.lider + producto.precios.lider,
      unimarc: total.unimarc + producto.precios.unimarc,
    }),
    { lider: 0, unimarc: 0 },
  );
}

export function resumirCategoria(
  productos: readonly Product[],
  categoria: Categoria,
) {
  const productosCategoria = productos.filter(
    (producto) => producto.categoria === categoria,
  );
  const totales = sumarPrecios(productosCategoria);
  return {
    categoria,
    productos: productosCategoria,
    totales,
    ...compararPrecios(totales),
  };
}

export function calcularAhorroPromedio(
  productos: readonly Product[],
  categorias: readonly Categoria[],
) {
  if (categorias.length === 0) return 0;
  return (
    categorias.reduce(
      (suma, categoria) => suma + resumirCategoria(productos, categoria).ahorro,
      0,
    ) / categorias.length
  );
}

// El límite también se aplica al actualizar el estado, aunque el botón esté deshabilitado.
export function alternarSeleccion(
  ids: readonly number[],
  id: number,
): number[] {
  if (ids.includes(id))
    return ids.filter((seleccionado) => seleccionado !== id);
  return ids.length < 2 ? [...ids, id] : [...ids];
}

// Compara repartir la compra entre ambas tiendas frente a la tienda con menor total.
export function calcularAhorroCompra(productos: readonly Product[]) {
  const totales = sumarPrecios(productos);
  const totalUnaTienda = Math.min(totales.lider, totales.unimarc);
  const totalMejoresPrecios = productos.reduce(
    (suma, producto) => suma + compararPrecios(producto.precios).precioMenor,
    0,
  );
  return {
    totales,
    totalUnaTienda,
    totalMejoresPrecios,
    ahorro: totalUnaTienda - totalMejoresPrecios,
  };
}

export function filtrarProductos(
  productos: readonly Product[],
  busqueda: string,
  categoria: Categoria | "Todas",
) {
  const normalizar = (texto: string) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const termino = normalizar(busqueda);
  return productos.filter(
    (producto) =>
      (categoria === "Todas" || producto.categoria === categoria) &&
      normalizar(producto.nombre).includes(termino),
  );
}

export function precioPorUnidad(producto: Product) {
  const factor = producto.unidad === "g" || producto.unidad === "ml" ? 1000 : 1;
  const unidad =
    producto.unidad === "g"
      ? "kg"
      : producto.unidad === "ml"
        ? "L"
        : producto.unidad;
  return {
    unidad,
    lider: (producto.precios.lider * factor) / producto.contenido,
    unimarc: (producto.precios.unimarc * factor) / producto.contenido,
  };
}

export function describirContenido(producto: Product) {
  return `${producto.contenido.toLocaleString("es-CL")} ${producto.unidad} · ${producto.tamano}`;
}
