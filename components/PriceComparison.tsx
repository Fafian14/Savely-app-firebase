import { Text, View } from "react-native";
import { supermercados, type Precios } from "@/models/Product";
import { compararPrecios, formatearPesos } from "@/store/product-comparison";
import StoreBadge from "./StoreBadge";

export default function PriceComparison({ precios, total = false, variante = "actual" }: { precios: Precios; total?: boolean; variante?: "actual" | "zip" }) {
  const { mejorSupermercado, ahorro } = compararPrecios(precios);
  return (
    <View className={variante === "zip" ? "gap-2" : "gap-3"}>
      {supermercados.map((tienda) => {
        const precio = precios[tienda.clave];
        const recomendado = mejorSupermercado === tienda.nombre;
        return <View key={tienda.clave} className={variante === "zip" ? `flex-row flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2 ${recomendado ? "bg-[#edf4eb]" : "bg-slate-50"}` : "flex-row flex-wrap justify-between gap-2"}>
          {variante === "zip" ? <View className="flex-row items-center gap-2"><StoreBadge supermercado={tienda.nombre} />{total && <Text className="text-xs text-slate-500">total</Text>}</View> : <Text className="text-base text-slate-600">{tienda.nombre}{total ? " total" : ""}</Text>}
          <Text className={variante === "zip" ? `text-sm font-work-medium ${recomendado ? "text-[#286344]" : "text-slate-800"}` : "text-base font-work-medium text-slate-800"}>
            {typeof precio === "number" ? formatearPesos(precio) : total ? "Faltan precios" : "Sin precio registrado"}
          </Text>
        </View>;
      })}
      <View className={variante === "zip" ? "rounded-2xl bg-[#e7f1e9] p-3" : "rounded-2xl bg-teal-50 p-3"}>
        <Text className="text-sm font-work-medium text-teal-800">
          {Object.keys(precios).length === 0 ? "No hay una tienda con todos los precios registrados" : mejorSupermercado ? "Mejor precio registrado: " + mejorSupermercado : "Mismo precio entre las tiendas comparables"}
        </Text>
        {Object.keys(precios).length >= 2 && <Text className="mt-1 text-lg font-work-medium text-teal-700">Diferencia máxima: {formatearPesos(ahorro)}</Text>}
        {total && <Text className="mt-1 text-xs text-teal-800">Solo comparamos totales de tiendas con todos los precios de la lista.</Text>}
      </View>
    </View>
  );
}
