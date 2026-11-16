/**
 * RESUMEN POR CATEGORÍAS: compara comprar una unidad de cada producto en una tienda.
 * También presenta el promedio aritmético de las diferencias de las cinco categorías.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import CategoryIcon from "@/components/CategoryIcon";
import SavingsCard from "@/components/SavingsCard";
import StoreBadge from "@/components/StoreBadge";
import type { Supermercado } from "@/models/Product";
import { supermercados } from "@/models/Product";
import { useCatalog } from "@/store/CatalogProvider";
import { categorias } from "@/store/products.store";
import {
  calcularAhorroPromedio,
  formatearPesos,
  resumirCategoria,
} from "@/store/product-comparison";

export default function CategoryComparison() {
  // Consume el catálogo actual: las modificaciones se reflejan en categorías y promedio.
  const { productos } = useCatalog();
  const cantidadComparables = categorias.filter((categoria) => { const r = resumirCategoria(productos, categoria); return r.productos.length > 0 && Object.keys(r.totales).length >= 2; }).length;
  // SavingsCard recibe el promedio por props. map genera un enlace por categoría.
  // resumirCategoria calcula totales y ordena visualmente la tienda con menor total.
  // Un empate se etiqueta como tal; el orden visual no representa una ventaja en ese caso.
  return (
    <View>
      {cantidadComparables > 0 ? <SavingsCard
        titulo="Diferencia promedio por categoría"
        ahorro={calcularAhorroPromedio(productos, categorias)}
        descripcion="Comparamos categorías con precios completos en al menos dos tiendas."
      /> : <Text className="rounded-2xl bg-teal-50 p-4 text-teal-800">Faltan precios completos en al menos dos tiendas para comparar categorías.</Text>}
      <View className="mb-3 mt-5 flex-row px-3">
        <Text className="w-1/3 text-xs text-slate-500">Categoría</Text>
        <Text className="w-1/3 text-xs text-slate-500">Mejor opción</Text>
        <Text className="w-1/3 text-xs text-slate-500">2da opción</Text>
      </View>
      <View className="gap-3">
        {categorias.map((categoria) => {
          const resumen = resumirCategoria(productos, categoria);
          const orden: Supermercado[] = supermercados
            .map((tienda) => ({ nombre: tienda.nombre, total: resumen.totales[tienda.clave] ?? Infinity }))
            .filter((tienda) => Number.isFinite(tienda.total))
            .sort((a, b) => a.total - b.total)
            .slice(0, 2)
            .map((tienda) => tienda.nombre);
          return (
            <Link
              key={categoria}
              href={{
                pathname: "/compare/categories/[categoria]",
                params: { categoria: categoria.toLowerCase() },
              }}
              asChild
            >
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Ver categoría ${categoria}`}
                className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm active:bg-teal-50"
              >
                <View className="flex-row items-center">
                  <View className="w-1/3 gap-2 pr-2">
                    <CategoryIcon categoria={categoria} />
                    <Text className="text-sm font-work-medium text-slate-800">
                      {categoria}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      {resumen.productos.length} productos
                    </Text>
                  </View>
                  {orden.map((tienda, indice) => (
                    <View
                      key={tienda}
                      className={`w-1/3 gap-2 px-2 ${indice === 1 ? "border-l border-slate-100" : ""}`}
                    >
                      <StoreBadge supermercado={tienda} />
                      <Text className="text-sm font-work-medium text-slate-800">
                        {formatearPesos(
                          resumen.totales[supermercados.find((opcion) => opcion.nombre === tienda)!.clave] ?? 0,
                        )}
                      </Text>
                      <Text
                        className={`text-xs ${indice === 0 ? "text-teal-700" : "text-slate-500"}`}
                      >
                        {indice === 0
                          ? resumen.mejorSupermercado
                            ? "Menor total"
                            : "Empate"
                          : "Total categoría"}
                      </Text>
                    </View>
                  ))}
                </View>
                <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-2">
                  <Text className="text-xs font-work-medium text-teal-700">
                    {Object.keys(resumen.totales).length >= 2 ? `Diferencia máxima: ${formatearPesos(resumen.ahorro)}` : "Faltan precios para comparar la categoría"}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#64748b" />
                </View>
              </Pressable>
            </Link>
          );
        })}
      </View>
      <View className="mt-4 flex-row items-start gap-2 rounded-2xl bg-teal-50 p-4">
        <Ionicons name="information-circle-outline" size={22} color="#0f766e" />
        <Text className="flex-1 text-xs leading-5 text-slate-600">
          Sumamos una unidad de cada producto por tienda. El ahorro promedio es
          la suma de las diferencias de las {cantidadComparables} categorías comparables
          dividida entre su cantidad, cuando existe alguna. Solo se comparan tiendas con todos los precios de la categoría.
        </Text>
      </View>
    </View>
  );
}
