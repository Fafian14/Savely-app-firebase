/**
 * CARRITO / MI LISTA: lista persistida de IDs, con una unidad por producto.
 * Muestra totales por tienda; no implementa cantidades configurables ni pagos.
 */
import { Link } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, Text, View } from "react-native";
import Header from "@/components/Header";
import ListButton from "@/components/ListButton";
import ProductImage from "@/components/ProductImage";
import ProductMetadata from "@/components/ProductMetadata";
import PriceComparison from "@/components/PriceComparison";
import { useCatalog } from "@/store/CatalogProvider";
import { sumarPrecios } from "@/store/product-comparison";
export default function CartScreen() {
  const { productos, lista } = useCatalog();
  // Cruza IDs con el catálogo actual: una edición se refleja aquí sin duplicar productos.
  const elegidos = productos.filter((p) => lista.includes(p.id));
  // Si hay productos, PriceComparison compara los totales de comprar toda la lista en cada tienda.
  // ListButton permite quitar elementos; el mensaje vacío aparece cuando la lista no contiene productos.
  return (
    <ScrollView contentContainerClassName="pb-6">
      <View className="mx-auto w-full max-w-2xl p-4">
        <Header titulo="Mi lista de compra" />
        <Text className="mb-5 text-sm leading-5 text-slate-500">
          Revisa tus productos y compara cuánto pagarías en cada supermercado.
        </Text>
        {elegidos.length > 0 ? (
          <>
            <View className="mb-4 overflow-hidden rounded-3xl border border-slate-100 bg-white">
              <View className="flex-row items-center justify-between bg-teal-800 px-4 py-4">
                <View>
                  <Text className="text-sm text-teal-100">
                    {elegidos.length}{" "}
                    {elegidos.length === 1 ? "producto" : "productos"} en tu lista
                  </Text>
                  <Text className="mt-1 text-xl font-work-medium text-white">
                    Total estimado
                  </Text>
                </View>
                <View className="h-11 w-11 items-center justify-center rounded-full bg-white/15">
                  <Ionicons name="basket" size={23} color="white" />
                </View>
              </View>
              <View className="p-4">
                <PriceComparison precios={sumarPrecios(elegidos)} total />
              </View>
            </View>
            <Link href="/route" asChild>
              <Pressable
                accessibilityRole="link"
                className="mb-5 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-teal-700 p-4 active:bg-teal-800"
              >
                <Ionicons name="map-outline" size={20} color="white" />
                <Text className="font-work-medium text-white">
                  Planificar mi ruta
                </Text>
                <Ionicons name="arrow-forward" size={17} color="white" />
              </Pressable>
            </Link>
          </>
        ) : (
          <View className="mb-4 items-center rounded-3xl border border-slate-100 bg-white px-5 py-8">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-3xl bg-teal-50">
              <Ionicons name="basket-outline" size={32} color="#0f766e" />
            </View>
            <Text className="text-xl font-work-medium text-slate-800">
              Todavía no agregas productos
            </Text>
            <Text className="mb-5 mt-2 max-w-sm text-center text-sm leading-5 text-slate-500">
              Explora el catálogo y guarda lo que necesitas para comparar
              precios y preparar tu ruta.
            </Text>
            <Link
              href="/products"
              className="min-h-12 w-full rounded-xl bg-teal-700 p-3 text-center font-work-medium text-white"
            >
              Explorar productos
            </Link>
          </View>
        )}
        {elegidos.length > 0 && (
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-work-medium text-slate-800">
              Productos
            </Text>
            <Link
              href="/products"
              className="min-h-11 justify-center text-sm font-work-medium text-teal-700"
            >
              Añadir más
            </Link>
          </View>
        )}
        <View className="gap-3">
          {elegidos.map((p) => (
            <View
              key={p.id}
              className="rounded-2xl border border-slate-100 bg-white p-4"
            >
              <Link
                href={{ pathname: "/products/detail", params: { id: p.id } }}
                asChild
              >
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Ver detalle de ${p.nombre}`}
                  className="mb-3 flex-row items-center gap-3"
                >
                  <View className="h-14 w-14 rounded-xl bg-slate-50">
                    <ProductImage producto={p} mini />
                  </View>
                  <View className="flex-1">
                    <Text className="font-work-medium text-slate-800">
                      {p.nombre}
                    </Text>
                    <Text className="mt-1 text-xs text-teal-700">
                      Ver detalle y precios
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#94a3b8"
                  />
                </Pressable>
              </Link>
              <ProductMetadata producto={p} />
              <ListButton id={p.id} />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
