/**
 * CÁLCULOS Y BÚSQUEDA: funciones reutilizables que trabajan con datos, sin JSX ni almacenamiento.
 * Se comparan precios ficticios para una unidad de cada producto y se devuelven resultados derivados.
 */
import type {
  Categoria,
  Precios,
  Product,
  Supermercado,
} from "../models/Product";
import { supermercados } from "../models/Product";

// Redondea para mostrar pesos y usa separadores chilenos: 1490 se presenta como $1.490.
export function formatearPesos(valor: number): string {
  return "$" + Math.round(valor).toLocaleString("es-CL");
}

// Compara solo precios registrados. Un empate entre todos devuelve null.
export function compararPrecios(precios: Precios) {
  const registrados = supermercados.filter((s) => typeof precios[s.clave] === "number" && Number.isFinite(precios[s.clave]));
  const valores = registrados.map((s) => precios[s.clave]!);
  if (!valores.length) return { mejorSupermercado: null as Supermercado | null, precioMenor: 0, ahorro: 0 };
  const menor = Math.min(...valores);
  const mayor = Math.max(...valores);
  return {
    mejorSupermercado: menor === mayor && registrados.length > 1 ? null : registrados.find((s) => precios[s.clave] === menor)!.nombre as Supermercado,
    precioMenor: menor,
    ahorro: mayor - menor,
  };
}

// Solo totaliza una tienda cuando tiene precio para TODOS los productos.
// Un total incompleto se omite, nunca se presenta como una compra más barata.
export function sumarPrecios(productos: readonly Product[]): Precios {
  if (!productos.length) return { lider: 0, unimarc: 0 };
  const total: Precios = {};
  for (const tienda of supermercados) {
    if (productos.length === 0 && tienda.clave !== "lider" && tienda.clave !== "unimarc") continue;
    if (productos.every((p) => typeof p.precios[tienda.clave] === "number"))
      total[tienda.clave] = productos.reduce((suma, p) => suma + p.precios[tienda.clave]!, 0);
  }
  return total;
}

// filter extrae la categoría; luego suma y compara la compra completa en cada tienda.
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

// Promedio aritmético de los ahorros por categoría, no promedio de precios individuales.
export function calcularAhorroPromedio(
  productos: readonly Product[],
  categorias: readonly Categoria[],
) {
  const comparables = categorias.map((categoria) => resumirCategoria(productos, categoria))
    .filter((r) => r.productos.length > 0 && Object.keys(r.totales).length >= 2);
  return comparables.length ? comparables.reduce((suma, r) => suma + r.ahorro, 0) / comparables.length : 0;
}

// El límite también se aplica al actualizar el estado, aunque el botón esté deshabilitado.
// Una selección repetida se quita; una nueva solo entra si hay menos de dos IDs.
// La regla también se aplica aquí aunque la interfaz deshabilite el botón.
export function alternarSeleccion(
  ids: readonly number[],
  id: number,
): number[] {
  if (ids.includes(id))
    return ids.filter((seleccionado) => seleccionado !== id);
  return ids.length < 2 ? [...ids, id] : [...ids];
}

// Compara repartir la compra entre ambas tiendas frente a la tienda con menor total.
// Compara repartir productos al menor precio con comprar todo en la tienda de menor total.
// Tiene pruebas, pero no está conectado al banner actual: ese banner usa ahorroOfertas.
export function calcularAhorroCompra(productos: readonly Product[]) {
  const totales = sumarPrecios(productos);
  const totalUnaTienda = Object.keys(totales).length ? Math.min(...Object.values(totales)) : null;
  const totalMejoresPrecios = productos.reduce(
    (suma, producto) => suma + compararPrecios(producto.precios).precioMenor,
    0,
  );
  return {
    totales,
    totalUnaTienda,
    totalMejoresPrecios,
    ahorro: totalUnaTienda === null ? 0 : totalUnaTienda - totalMejoresPrecios,
  };
}

// Combina búsqueda por nombre y categoría. Todas omite la restricción de categoría.
export function filtrarProductos(
  productos: readonly Product[],
  busqueda: string,
  categoria: Categoria | "Todas",
) {
  // NFD separa letras y acentos; la expresión regular elimina los acentos.
  // Después pasa a minúsculas y recorta espacios: PLATANOS encuentra Plátanos.
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

// Normaliza gramos a kg y mililitros a L con factor 1000; kg, L y ud mantienen factor 1.
// Ejemplo: 500 ml a $1000 equivalen a $2000/L. La validación impide contenido cero.
export function precioPorUnidad(producto: Product) {
  const factor = producto.unidad === "g" || producto.unidad === "ml" ? 1000 : 1;
  const unidad =
    producto.unidad === "g"
      ? "kg"
      : producto.unidad === "ml"
        ? "L"
        : producto.unidad;
  const precios: Precios = {};
  for (const tienda of supermercados) {
    const precio = producto.precios[tienda.clave];
    if (typeof precio === "number") precios[tienda.clave] = (precio * factor) / producto.contenido;
  }
  return { unidad, ...precios };
}

// Construye el texto de cantidad, unidad y presentación utilizando el formato local.
export function describirContenido(producto: Product) {
  return `${producto.contenido.toLocaleString("es-CL")} ${producto.unidad} · ${producto.tamano}`;
}
