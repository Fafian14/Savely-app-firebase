/**
 * Firestore es la fuente del catálogo compartido. AsyncStorage conserva únicamente
 * la lista personal, la identidad de migración y el catálogo anterior como respaldo.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { Product, ProductInput } from "@/models/Product";
import type { Supermarket } from "@/models/Supermarket";
import {
  crearIdMigracion, eliminarProductoRemoto, guardarProductoRemoto,
  inicializarCatalogo, mensajeErrorCatalogo, migrarCatalogoLocal,
  observarProductos, observarSupermercados,
} from "@/services/catalogo";
import { leerCatalogo } from "./catalog";

const claveAnterior = "savely.catalog.v1";
const claveLista = "savely.lista.v2";
const claveMigracion = "savely.migracion.catalogo.v2";

interface CatalogContext {
  productos: Product[];
  lista: number[];
  supermercados: Supermarket[];
  guardar: (input: ProductInput, id?: number) => Promise<number>;
  eliminar: (id: number) => Promise<void>;
  alternarLista: (id: number) => Promise<void>;
}
const Context = createContext<CatalogContext | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [productos, setProductos] = useState<Product[]>([]);
  const [supermercados, setSupermercados] = useState<Supermarket[]>([]);
  const [lista, setLista] = useState<number[]>([]);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");
  const [desdeCache, setDesdeCache] = useState(false);
  const [intento, setIntento] = useState(0);
  const productosActuales = useRef<Product[]>([]);
  const listaActual = useRef<number[]>([]);
  const colaLista = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let cancelado = false;
    let productosConfirmados = false;
    let tiendasConfirmadas = false;
    let cacheProductos = true;
    let cacheTiendas = true;
    let detenerProductos: (() => void) | undefined;
    let detenerTiendas: (() => void) | undefined;
    setError("");

    function fallar(causa: unknown) {
      if (!cancelado) setError(mensajeErrorCatalogo(causa));
    }
    function actualizarConexion() {
      if (cancelado) return;
      setDesdeCache(cacheProductos || cacheTiendas);
      if (productosConfirmados && tiendasConfirmadas) setListo(true);
    }
    async function cargar() {
      try {
        const guardada = await AsyncStorage.getItem(claveLista);
        let ids: number[];
        if (guardada !== null) {
          const valor: unknown = JSON.parse(guardada);
          if (!Array.isArray(valor) || !valor.every((id) => Number.isSafeInteger(id) && id > 0) || new Set(valor).size !== valor.length)
            throw new Error("No pudimos leer tu lista personal. El respaldo local se ha conservado.");
          ids = valor;
        } else {
          ids = [];
        }
        await inicializarCatalogo();
        if (cancelado) return;
        // La lista v2 solo se crea después de confirmar la importación remota.
        if (guardada === null) {
          const texto = await AsyncStorage.getItem(claveAnterior);
          if (texto) {
            const local = leerCatalogo(texto);
            let migracionId = await AsyncStorage.getItem(claveMigracion);
            if (!migracionId) {
              migracionId = crearIdMigracion();
              await AsyncStorage.setItem(claveMigracion, migracionId);
            }
            const mapa = await migrarCatalogoLocal(local, migracionId);
            ids = local.lista.map((id) => mapa[String(id)] ?? id);
          }
          if (cancelado) return;
          await AsyncStorage.setItem(claveLista, JSON.stringify(ids));
        }
        if (cancelado) return;
        listaActual.current = ids;
        setLista(ids);
        detenerProductos = observarProductos((datos, cache) => {
          if (cancelado || (!productosConfirmados && cache)) return;
          productosActuales.current = datos;
          setProductos(datos);
          cacheProductos = cache;
          productosConfirmados = true;
          actualizarConexion();
        }, fallar);
        detenerTiendas = observarSupermercados((datos, cache) => {
          if (cancelado || (!tiendasConfirmadas && cache)) return;
          setSupermercados(datos);
          cacheTiendas = cache;
          tiendasConfirmadas = true;
          actualizarConexion();
        }, fallar);
      } catch (causa) { fallar(causa); }
    }
    void cargar();
    return () => {
      cancelado = true;
      detenerProductos?.();
      detenerTiendas?.();
    };
  }, [intento]);

  // Serializa solamente la lista personal; los IDs de productos los reserva Firestore.
  function alternarLista(id: number) {
    const tarea = colaLista.current.then(async () => {
      if (!productosActuales.current.some((p) => p.id === id))
        throw new Error("Este producto ya no existe.");
      const vigentes = listaActual.current.filter((valor) => productosActuales.current.some((p) => p.id === valor));
      const siguiente = vigentes.includes(id) ? vigentes.filter((valor) => valor !== id) : [...vigentes, id];
      await AsyncStorage.setItem(claveLista, JSON.stringify(siguiente));
      listaActual.current = siguiente;
      setLista(siguiente);
    });
    colaLista.current = tarea.catch(() => undefined);
    return tarea;
  }

  const aviso = (
    <View className="bg-amber-50 p-4">
      <Text accessibilityRole={error ? "alert" : "text"} className="text-amber-900">
        {error || "Mostrando la última información recibida. Necesitas conexión para guardar cambios en el catálogo."}
      </Text>
      {!!error && (
        <Pressable accessibilityRole="button" onPress={() => setIntento((v) => v + 1)} className="mt-2 min-h-11 justify-center">
          <Text className="font-work-medium text-teal-800">Reintentar conexión</Text>
        </Pressable>
      )}
    </View>
  );

  if (!listo) return (
    <View className="flex-1 items-center justify-center bg-slate-50 p-6">
      {error ? aviso : <Text className="text-center text-slate-700">Cargando catálogo de Firebase…</Text>}
    </View>
  );

  return (
    <Context.Provider value={{
      productos, supermercados,
      // Un producto borrado en otro dispositivo también desaparece de la lista visible.
      lista: lista.filter((id) => productos.some((p) => p.id === id)),
      guardar: async (input, id) => {
        const producto = await guardarProductoRemoto(input, id);
        // Publica tras confirmar el commit, antes de navegar al detalle.
        const siguientes = [...productosActuales.current.filter((p) => p.id !== producto.id), producto].sort((a, b) => a.id - b.id);
        productosActuales.current = siguientes;
        setProductos(siguientes);
        return producto.id;
      },
      eliminar: async (id) => {
        await eliminarProductoRemoto(id);
        const siguientes = productosActuales.current.filter((p) => p.id !== id);
        productosActuales.current = siguientes;
        setProductos(siguientes);
      },
      alternarLista,
    }}>
      <View className="flex-1">
        {(!!error || desdeCache) && aviso}
        {children}
      </View>
    </Context.Provider>
  );
}

export function useCatalog() {
  const context = useContext(Context);
  if (!context) throw new Error("Falta CatalogProvider.");
  return context;
}
