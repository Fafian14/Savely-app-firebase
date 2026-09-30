import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";

import type { Categoria } from "@/models/Product";

const estilos = {
  Alimentos: { icono: "nutrition", fondo: "bg-emerald-400" },
  Bebidas: { icono: "water", fondo: "bg-blue-400" },
  Limpieza: { icono: "sparkles", fondo: "bg-teal-400" },
  Higiene: { icono: "leaf", fondo: "bg-violet-400" },
  Hogar: { icono: "home", fondo: "bg-orange-400" },
} as const;

export default function CategoryIcon({ categoria }: { categoria: Categoria }) {
  const estilo = estilos[categoria];
  return (
    <View
      className={`h-9 w-9 items-center justify-center rounded-full ${estilo.fondo}`}
    >
      <Ionicons name={estilo.icono} size={20} color="white" />
    </View>
  );
}
