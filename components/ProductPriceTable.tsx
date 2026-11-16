/** Comparación de cada producto entre todos los supermercados disponibles. */
import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import ProductImage from "@/components/ProductImage";
import StoreBadge from "@/components/StoreBadge";
import type { Product } from "@/models/Product";
import { supermercados } from "@/models/Product";
import {
  compararPrecios,
  formatearPesos,
  describirContenido,
  precioPorUnidad,
} from "@/store/product-comparison";

interface Props {
  productos: Product[];
  seleccionados?: number[];
  onSeleccionar?: (id: number) => void;
}

export default function ProductPriceTable({
  productos,
  seleccionados = [],
  onSeleccionar,
}: Props) {
  return (
    <View className="gap-3">
      {productos.map((producto) => {
        const comparacion = compararPrecios(producto.precios);
        const normalizado = precioPorUnidad(producto);
        const seleccionado = seleccionados.includes(producto.id);
        const deshabilitado = seleccionados.length >= 2 && !seleccionado;
        return (
          <View key={producto.id} className="overflow-hidden rounded-3xl border border-[#e8ece5] bg-white shadow-sm">
            <Link href={{ pathname: "/products/detail", params: { id: producto.id } }} asChild>
              <Pressable accessibilityRole="link" accessibilityLabel={`Ver detalle de ${producto.nombre}`} className="flex-row items-center gap-3 p-4 active:bg-[#f5f8f3]">
                <View className="h-14 w-14 rounded-2xl bg-[#f3f6ef]">
                  <ProductImage producto={producto} mini />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] text-slate-400">ID · {producto.id}</Text>
                  <Text className="mt-0.5 font-work-medium text-slate-800">{producto.nombre}</Text>
                  <Text className="mt-1 text-xs text-slate-500">{describirContenido(producto)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </Pressable>
            </Link>
            <View className="flex-row flex-wrap gap-2 px-4 pb-3">
              {supermercados.map((tienda) => {
                const precio = producto.precios[tienda.clave];
                const precioUnidad = normalizado[tienda.clave];
                const mejor = comparacion.mejorSupermercado === tienda.nombre;
                return (
                  <View key={tienda.clave} className={`w-[48%] rounded-2xl border p-3 ${mejor ? "border-[#d4e5d4] bg-[#f1f7ef]" : "border-slate-100 bg-slate-50"}`}>
                    <StoreBadge supermercado={tienda.nombre} />
                    <Text className={`mt-2 font-work-medium ${mejor ? "text-[#286344]" : "text-slate-800"}`}>{typeof precio === "number" ? formatearPesos(precio) : "Sin precio registrado"}</Text>
                    {typeof precioUnidad === "number" && (
                      <Text className="mt-0.5 text-[10px] text-slate-500">{formatearPesos(precioUnidad)}/{normalizado.unidad}</Text>
                    )}
                    {mejor && <Text className="mt-1 text-[10px] font-work-medium text-[#286344]">Mejor precio</Text>}
                  </View>
                );
              })}
            </View>
            <View className="flex-row items-center gap-2 border-t border-slate-100 bg-white px-4 py-3">
              <View className="flex-1">
                <Text className="text-xs text-slate-600">
                  {comparacion.mejorSupermercado ? `Mejor opción: ${comparacion.mejorSupermercado}` : "Empate en el menor precio"}
                </Text>
                <Text className="mt-1 text-xs font-work-medium text-[#286344]">Diferencia máxima: {formatearPesos(comparacion.ahorro)}</Text>
              </View>
              {onSeleccionar && (
                <Pressable
                  onPress={() => onSeleccionar(producto.id)}
                  disabled={deshabilitado}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Seleccionar ${producto.nombre}`}
                  accessibilityState={{ checked: seleccionado, disabled: deshabilitado }}
                  aria-checked={seleccionado}
                  className={`min-h-11 min-w-11 items-center justify-center rounded-xl border px-3 ${seleccionado ? "border-[#286344] bg-[#286344]" : "border-[#c8dccb] bg-white"} ${deshabilitado ? "opacity-40" : ""}`}
                >
                  <Ionicons name={seleccionado ? "checkmark" : "add"} size={22} color={seleccionado ? "white" : "#286344"} />
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}