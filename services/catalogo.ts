import {
  collection,
  doc,
  getDocsFromServer,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../firebaseconfig";
import type { Product, ProductInput } from "../models/Product";
import type { Supermarket } from "../models/Supermarket";
import { guardarProducto, leerCatalogo, type CatalogState } from "../store/catalog";
import { productos as semilla } from "../store/products.store";
import { supermercadosIniciales } from "../store/supermarkets.store";

const productosRef = collection(db, "productos");
const supermercadosRef = collection(db, "supermercados");
const contadorRef = doc(db, "configuracion", "catalogo");

function siguienteId(data: DocumentData | undefined): number {
  if (
    !data || data.version !== 1 || data.inicializado !== true ||
    !Number.isSafeInteger(data.siguienteId) || data.siguienteId < 1
  ) throw new Error("La configuración del catálogo en Firebase no es válida.");
  return data.siguienteId;
}

// Valida datos externos y conserva solo campos de Product (no los timestamps).
export function leerProductoRemoto(data: unknown, documentoId: string): Product {
  const raw = data as Product | null;
  if (!raw || String(raw.id) !== documentoId)
    throw new Error(`El producto ${documentoId} tiene un ID no válido.`);
  const state = leerCatalogo(JSON.stringify({
    productos: [raw], lista: [], siguienteId: raw.id + 1, versionImagenes: 1,
  }));
  const p = state.productos[0];
  return {
    id: p.id, nombre: p.nombre, descripcion: p.descripcion,
    categoria: p.categoria, precios: { ...(p.precios.lider !== undefined ? { lider: p.precios.lider } : {}),
      ...(p.precios.unimarc !== undefined ? { unimarc: p.precios.unimarc } : {}),
      ...(p.precios.jumbo !== undefined ? { jumbo: p.precios.jumbo } : {}),
      ...(p.precios.santaIsabel !== undefined ? { santaIsabel: p.precios.santaIsabel } : {}) },
    imagen: p.imagen, contenido: p.contenido, unidad: p.unidad,
    tamano: p.tamano, oferta: p.oferta,
  };
}

function iguales(a: Product, b: Product) {
  return JSON.stringify(leerProductoRemoto(a, String(a.id))) ===
    JSON.stringify(leerProductoRemoto(b, String(b.id)));
}

export function leerSupermercadoRemoto(data: DocumentData, id: string): Supermarket {
  const esperado = supermercadosIniciales.find((s) => s.id === id);
  if (
    !esperado || data.id !== id || data.nombre !== esperado.nombre ||
    data.moneda !== "CLP" || (data.distancia !== undefined && (!Number.isFinite(data.distancia) || data.distancia < 0))
  ) throw new Error(`El supermercado ${id} no tiene datos válidos.`);
  return { id: esperado.id, nombre: data.nombre, moneda: "CLP", ...(data.distancia !== undefined ? { distancia: data.distancia } : {}) };
}

// La marca permanente impide volver a sembrar un catálogo que quedó vacío por borrados.
// La transacción conserva documentos existentes y permite repetir la migración.
export async function inicializarCatalogo(): Promise<void> {
  // Esta consulta también permite respetar IDs que ya existan antes de la migración.
  const existentes = await getDocsFromServer(productosRef);
  const anteriores = existentes.docs.map((d) => leerProductoRemoto(d.data(), d.id));
  await runTransaction(db, async (tx) => {
    const config = await tx.get(contadorRef);
    if (config.exists()) { siguienteId(config.data()); return; }
    const productos = await Promise.all(semilla.map((p) => tx.get(doc(productosRef, String(p.id)))));
    const tiendas = await Promise.all(supermercadosIniciales.map((s) => tx.get(doc(supermercadosRef, s.id))));
    // Todas las lecturas terminan antes de la primera escritura.
    productos.forEach((actual, i) => {
      if (actual.exists()) leerProductoRemoto(actual.data(), String(semilla[i].id));
      else tx.set(doc(productosRef, String(semilla[i].id)), {
        ...semilla[i], creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp(),
      });
    });
    tiendas.forEach((actual, i) => {
      const s = supermercadosIniciales[i];
      if (actual.exists()) leerSupermercadoRemoto(actual.data()!, s.id);
      else tx.set(doc(supermercadosRef, s.id), s);
    });
    tx.set(contadorRef, {
      version: 1, inicializado: true,
      siguienteId: Math.max(0, ...anteriores.map((p) => p.id), ...semilla.map((p) => p.id)) + 1,
      migradoEn: serverTimestamp(),
    });
  });
  // Amplía una base ya inicializada sin tocar productos, precios ni el contador.
  await runTransaction(db, async (tx) => {
    const tiendas = await Promise.all(supermercadosIniciales.map((s) => tx.get(doc(supermercadosRef, s.id))));
    tiendas.forEach((actual, i) => {
      const tienda = supermercadosIniciales[i];
      if (actual.exists()) leerSupermercadoRemoto(actual.data()!, tienda.id);
      else tx.set(doc(supermercadosRef, tienda.id), tienda);
    });
  });
}

export function crearIdMigracion(): string {
  return doc(collection(db, "migracionesCatalogo")).id;
}

// Importa cambios locales una sola vez por dispositivo. Si otro dispositivo ya
// modificó el mismo ID, conserva ambos productos asignando un ID nuevo al local.
// No interpreta un borrado local antiguo como una orden de borrar datos compartidos.
export async function migrarCatalogoLocal(
  local: CatalogState,
  migracionId: string,
): Promise<Record<string, number>> {
  const validado = leerCatalogo(JSON.stringify(local));
  const migracionRef = doc(db, "migracionesCatalogo", migracionId);
  return runTransaction(db, async (tx) => {
    const marca = await tx.get(migracionRef);
    if (marca.exists()) {
      const mapa: unknown = marca.data().mapa;
      if (!mapa || typeof mapa !== "object" ||
          Object.entries(mapa).some(([k, v]) => !/^\d+$/.test(k) || !Number.isSafeInteger(v) || Number(v) < 1))
        throw new Error("La migración local guardada no es válida.");
      return mapa as Record<string, number>;
    }
    const config = await tx.get(contadorRef);
    let proximo = siguienteId(config.data());
    const remotos = await Promise.all(validado.productos.map((p) => tx.get(doc(productosRef, String(p.id)))));
    const mapa: Record<string, number> = {};
    const escrituras: { producto: Product; nuevo: boolean; previo?: DocumentData }[] = [];
    validado.productos.forEach((local, i) => {
      mapa[local.id] = local.id;
      const base = semilla.find((p) => p.id === local.id);
      // Los datos iniciales sin cambios no se importan ni se resucitan.
      if (base && iguales(base, local)) return;
      const snapshot = remotos[i];
      const remoto = snapshot.exists() ? leerProductoRemoto(snapshot.data(), String(local.id)) : null;
      if (remoto && iguales(remoto, local)) return;
      if (remoto && base && iguales(remoto, base)) {
        escrituras.push({ producto: local, nuevo: false, previo: snapshot.data() });
      } else {
        // El contador reserva IDs para todo el lote de forma atómica.
        if (!Number.isSafeInteger(proximo + 1)) throw new Error("Se agotaron los IDs del catálogo.");
        mapa[local.id] = proximo;
        escrituras.push({ producto: { ...local, id: proximo++ }, nuevo: true });
      }
    });
    // Comprueba que ningún ID reservado se haya ocupado manualmente en la consola.
    const destinos = await Promise.all(escrituras.filter((e) => e.nuevo).map((e) => tx.get(doc(productosRef, String(e.producto.id)))));
    if (destinos.some((d) => d.exists()))
      throw new Error("El contador de Firebase coincide con un producto existente. Revisa configuracion/catalogo.");
    for (const e of escrituras) {
      tx.set(doc(productosRef, String(e.producto.id)), {
        ...e.producto,
        creadoEn: e.previo?.creadoEn ?? serverTimestamp(), actualizadoEn: serverTimestamp(),
      });
    }
    if (proximo !== siguienteId(config.data())) tx.update(contadorRef, { siguienteId: proximo });
    tx.set(migracionRef, { mapa, completadoEn: serverTimestamp() });
    return mapa;
  });
}

export async function guardarProductoRemoto(input: ProductInput, id?: number): Promise<Product> {
  return runTransaction(db, async (tx) => {
    const config = await tx.get(contadorRef);
    const proximo = siguienteId(config.data());
    const destino = id ?? proximo;
    if (!Number.isSafeInteger(destino) || destino < 1 || !Number.isSafeInteger(proximo + 1))
      throw new Error("El ID del producto no es válido.");
    const ref = doc(productosRef, String(destino));
    const previo = await tx.get(ref);
    if (id !== undefined && !previo.exists()) throw new Error("Este producto ya no existe.");
    if (id === undefined && previo.exists())
      throw new Error("El contador coincide con un producto existente. Revisa configuracion/catalogo en Firebase.");
    const actual = previo.exists() ? leerProductoRemoto(previo.data(), String(destino)) : undefined;
    const estado = guardarProducto({
      productos: actual ? [actual] : [], lista: [], siguienteId: proximo, versionImagenes: 1,
    }, input, id);
    const producto = estado.productos.find((p) => p.id === destino)!;
    tx.set(ref, {
      ...producto, creadoEn: previo.data()?.creadoEn ?? serverTimestamp(), actualizadoEn: serverTimestamp(),
    });
    if (id === undefined) tx.update(contadorRef, { siguienteId: proximo + 1 });
    return producto;
  });
}

export async function eliminarProductoRemoto(id: number): Promise<void> {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("El ID del producto no es válido.");
  await runTransaction(db, async (tx) => {
    const ref = doc(productosRef, String(id));
    const actual = await tx.get(ref);
    if (actual.exists()) tx.delete(ref);
  });
}

// No publica escrituras pendientes como si ya estuvieran confirmadas por el servidor.
export function observarProductos(
  recibir: (productos: Product[], desdeCache: boolean) => void,
  fallar: (error: unknown) => void,
) {
  return onSnapshot(productosRef, { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.hasPendingWrites) return;
    try {
      recibir(snapshot.docs.map((d) => leerProductoRemoto(d.data(), d.id)).sort((a, b) => a.id - b.id), snapshot.metadata.fromCache);
    } catch (error) { fallar(error); }
  }, fallar);
}

export function observarSupermercados(
  recibir: (tiendas: Supermarket[], desdeCache: boolean) => void,
  fallar: (error: unknown) => void,
) {
  return onSnapshot(supermercadosRef, { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.hasPendingWrites) return;
    try {
      const tiendas = snapshot.docs.map((d) => leerSupermercadoRemoto(d.data(), d.id));
      if (tiendas.length !== supermercadosIniciales.length) throw new Error("Faltan supermercados en Firebase. Ejecuta la migración del catálogo.");
      recibir(tiendas.sort((a, b) => supermercadosIniciales.findIndex((s) => s.id === a.id) - supermercadosIniciales.findIndex((s) => s.id === b.id)), snapshot.metadata.fromCache);
    } catch (error) { fallar(error); }
  }, fallar);
}

export function mensajeErrorCatalogo(error: unknown): string {
  const causa = error as { code?: string; message?: string } | null;
  const codigo = causa?.code?.replace(/^firestore\//, "");
  if (codigo === "permission-denied" || codigo === "unauthenticated")
    return "Firebase no permitió acceder al catálogo. Revisa los permisos de productos, supermercados, configuracion y migracionesCatalogo.";
  if (codigo === "unavailable" || codigo === "deadline-exceeded")
    return "No pudimos conectar con Firebase. Revisa tu conexión a internet e inténtalo nuevamente.";
  return causa?.message || "No se pudo completar la operación con Firebase. Inténtalo nuevamente.";
}
