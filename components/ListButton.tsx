import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useCatalog } from "@/store/CatalogProvider";

export default function ListButton({ id }: { id: number }) {
  const { lista, alternarLista } = useCatalog();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
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
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        disabled={ocupado}
        onPress={() => void alternar()}
        className="mt-3 min-h-12 items-center justify-center rounded-xl bg-teal-50 p-3"
      >
        <Text className="text-teal-800">
          {ocupado
            ? "Guardando…"
            : lista.includes(id)
              ? "Quitar de mi lista"
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
