import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Text, View, Pressable } from "react-native";
import type { ProductInput } from "@/models/Product";
import { productos } from "./products.store";
import {
  guardarProducto,
  eliminarProducto,
  leerCatalogo,
  type CatalogState,
} from "./catalog";

const clave = "savely.catalog.v1";
const inicial: CatalogState = {
  productos,
  lista: [],
  siguienteId: Math.max(0, ...productos.map((p) => p.id)) + 1,
};
interface CatalogContext extends CatalogState {
  guardar: (input: ProductInput, id?: number) => Promise<number>;
  eliminar: (id: number) => Promise<void>;
  alternarLista: (id: number) => Promise<void>;
}
const Context = createContext<CatalogContext | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState(inicial);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");
  const actual = useRef(inicial);
  const cola = useRef<Promise<unknown>>(Promise.resolve());

  async function cargar() {
    setError("");
    try {
      const texto = await AsyncStorage.getItem(clave);
      actual.current = texto ? leerCatalogo(texto) : inicial;
      setEstado(actual.current);
      setListo(true);
    } catch {
      setError(
        "No pudimos leer tus datos locales. No se ha reemplazado el catálogo guardado.",
      );
    }
  }
  useEffect(() => {
    void cargar();
  }, []);

  // Serializa escrituras: una operación solo se publica cuando queda guardada.
  function modificar(transformar: (s: CatalogState) => CatalogState) {
    const tarea = cola.current.then(async () => {
      const siguiente = transformar(actual.current);
      await AsyncStorage.setItem(clave, JSON.stringify(siguiente));
      actual.current = siguiente;
      setEstado(siguiente);
      return siguiente;
    });
    cola.current = tarea.catch(() => undefined);
    return tarea;
  }
  if (!listo)
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        <Text className="text-center text-slate-700">
          {error || "Cargando Savely…"}
        </Text>
        {!!error && (
          <Pressable
            accessibilityRole="button"
            onPress={() => void cargar()}
            className="mt-4 rounded-xl bg-teal-700 p-4"
          >
            <Text className="text-white">Reintentar</Text>
          </Pressable>
        )}
      </View>
    );
  return (
    <Context.Provider
      value={{
        ...estado,
        guardar: async (input, id) => {
          const s = await modificar((prev) => guardarProducto(prev, input, id));
          return id ?? s.siguienteId - 1;
        },
        eliminar: async (id) => {
          await modificar((prev) => eliminarProducto(prev, id));
        },
        alternarLista: async (id) => {
          await modificar((prev) => ({
            ...prev,
            lista: prev.lista.includes(id)
              ? prev.lista.filter((v) => v !== id)
              : prev.productos.some((p) => p.id === id)
                ? [...prev.lista, id]
                : prev.lista,
          }));
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCatalog() {
  const context = useContext(Context);
  if (!context) throw new Error("Falta CatalogProvider.");
  return context;
}
