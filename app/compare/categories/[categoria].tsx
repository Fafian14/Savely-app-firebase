import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import Header from "@/components/Header";
import PriceComparison from "@/components/PriceComparison";
import ProductPriceTable from "@/components/ProductPriceTable";
import { resumirCategoria } from "@/store/product-comparison";
import { useCatalog } from "@/store/CatalogProvider";
import { categorias } from "@/store/products.store";

export function generateStaticParams() {
  return categorias.map((categoria) => ({
    categoria: categoria.toLowerCase(),
  }));
}

export default function CategoryDetailScreen() {
  const { productos } = useCatalog();
  const { categoria: slug } = useLocalSearchParams<{ categoria: string }>();
  const categoria = categorias.find((item) => item.toLowerCase() === slug);
  const resumen = categoria
    ? resumirCategoria(productos, categoria)
    : undefined;

  return (
    <ScrollView className="flex-1" contentContainerClassName="pb-6">
      <View className="mx-auto w-full max-w-2xl px-4 pt-4">
        <Header
          titulo={categoria ?? "Categoría no encontrada"}
          volverA="/compare/categories"
        />
        {resumen && (
          <View className="gap-4">
            <View className="rounded-2xl border border-teal-100 bg-white p-4">
              <Text className="mb-3 text-base font-work-medium text-slate-800">
                Total de {resumen.productos.length} productos
              </Text>
              <PriceComparison precios={resumen.totales} total />
            </View>
            <ProductPriceTable productos={resumen.productos} />
            <Text className="text-center text-xs text-slate-500">
              Precios ficticios · Una unidad de cada producto.
            </Text>
          </View>
        )}
        <Link href="/compare/categories" asChild>
          <Pressable
            accessibilityRole="link"
            className="mt-5 min-h-12 items-center justify-center rounded-2xl bg-teal-50 p-3"
          >
            <Text className="text-sm font-work-medium text-teal-800">
              Ver todas las categorías
            </Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}
