import { Text, View } from "react-native";

import type { Supermercado } from "@/models/Product";

export default function StoreBadge({
  supermercado,
}: {
  supermercado: Supermercado;
}) {
  return (
    <View
      className={`self-start rounded-lg px-2 py-1 ${supermercado === "Líder" ? "bg-blue-600" : "bg-red-600"}`}
    >
      <Text className="text-xs font-work-medium text-white">
        {supermercado}
      </Text>
    </View>
  );
}
