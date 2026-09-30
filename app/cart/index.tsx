import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import Header from "@/components/Header";
import ListButton from "@/components/ListButton";
import ProductMetadata from "@/components/ProductMetadata";
import PriceComparison from "@/components/PriceComparison";
import { useCatalog } from "@/store/CatalogProvider";
import { sumarPrecios } from "@/store/product-comparison";
export default function CartScreen() {
  const { productos, lista } = useCatalog();
  const elegidos = productos.filter((p) => lista.includes(p.id));
  return (
    <ScrollView contentContainerClassName="pb-6">
      <View className="mx-auto w-full max-w-2xl p-4">
        <Header titulo="Carrito · Mi lista" />
        <Text className="mb-4 text-sm text-slate-500">
          Una unidad de cada producto. Esta lista se usa en el filtro de Inicio
          y Ofertas.
        </Text>
        <Link
          href="/products"
          className="mb-4 rounded-xl bg-teal-700 p-4 text-center text-white"
        >
          Añadir productos
        </Link>
        {elegidos.length > 0 && (
          <View className="mb-4 rounded-xl bg-white p-4">
            <Text className="mb-3 text-lg font-work-medium text-slate-800">
              Total de mi lista
            </Text>
            <PriceComparison precios={sumarPrecios(elegidos)} total />
          </View>
        )}
        <View className="gap-3">
          {elegidos.map((p) => (
            <View key={p.id} className="rounded-2xl bg-white p-4">
              <Link
                href={{ pathname: "/products/detail", params: { id: p.id } }}
                className="mb-3 py-2 text-lg font-work-medium text-teal-700"
              >
                {p.nombre}
              </Link>
              <ProductMetadata producto={p} />
              <ListButton id={p.id} />
            </View>
          ))}
        </View>
        {!elegidos.length && (
          <Text className="rounded-xl bg-white p-5 text-center text-slate-600">
            Tu lista está vacía. Añade productos desde el catálogo o su detalle.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
