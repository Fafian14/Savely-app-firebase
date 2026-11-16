/**
 * BOTÓN DE LISTA: utiliza el contexto para añadir o quitar un ID del carrito persistido.
 */
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useCatalog } from "@/store/CatalogProvider";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function ListButton({ id, variante = "actual" }: { id: number; variante?: "actual" | "zip" }) {
  const { lista, alternarLista } = useCatalog();
  const enLista = lista.includes(id);
  // Estado local para mostrar Guardando y deshabilitar este botón durante la escritura.
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  // await espera alternarLista; catch presenta el fallo y finally permite volver a pulsar.
  async function alternar() {
    setOcupado(true);
    setError("");
    try {
      await alternarLista(id);
    } catch {
      setError("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setOcupado(false);
    }
  }
  // El texto se deriva de lista.includes(id): muestra añadir, quitar o guardando.
  // Los errores se renderizan como alertas accesibles.
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={enLista ? "Quitar de mi lista" : "Añadir a mi lista"}
        accessibilityState={{ selected: enLista, disabled: ocupado }}
        disabled={ocupado}
        onPress={() => void alternar()}
        className={variante === "zip" ? `mt-3 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl p-4 ${enLista ? "bg-teal-50 active:bg-teal-100" : "bg-teal-700 active:bg-teal-800"} ${ocupado ? "opacity-70" : ""}` : "mt-3 min-h-12 items-center justify-center rounded-xl bg-teal-50 p-3"}
      >
        {variante === "zip" && <Ionicons name={ocupado ? "sync-outline" : enLista ? "checkmark-circle" : "add-circle-outline"} size={20} color={enLista ? "#0f766e" : "white"} />}
        <Text className={variante === "zip" ? `font-work-medium ${enLista ? "text-teal-800" : "text-white"}` : "text-teal-800"}>
          {ocupado
            ? "Guardando…"
            : enLista
              ? variante === "zip" ? "En mi lista · Quitar" : "Quitar de mi lista"
              : "Añadir a mi lista"}
        </Text>
      </Pressable>
      {!!error && (
        <Text accessibilityRole="alert" className="mt-2 text-red-700">
          {error}
        </Text>
      )}
    </View>
  );
}
