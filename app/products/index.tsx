/**
 * PANTALLA CATÁLOGO: ruta /products. Permite buscar, abrir detalles y acceder a crear productos.
 */
import { useState } from "react";
import { Link } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Header from "@/components/Header";
import ProductMetadata from "@/components/ProductMetadata";
import ProductImage from "@/components/ProductImage";
import PriceComparison from "@/components/PriceComparison";
import ListButton from "@/components/ListButton";
import { useCatalog } from "@/store/CatalogProvider";
import { filtrarProductos } from "@/store/product-comparison";

export default function ProductsScreen() {
  const { productos } = useCatalog();
  // Estado local del buscador; onChangeText lo actualiza y provoca el nuevo render.
  const [busqueda, setBusqueda] = useState("");
  // Reutiliza el mismo filtro de Comparar, con categoría Todas.
  const visibles = filtrarProductos(productos, busqueda, "Todas");
  // map dibuja los productos y key usa el ID estable. Los componentes reutilizan imagen y precios.
  // La ruta fija de detalle recibe el ID como parámetro; ListButton modifica la lista compartida.
  // Si no hay coincidencias, se muestra el mensaje de lista vacía.
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="pb-6"
    >
      <View className="mx-auto w-full max-w-2xl bg-[#f5f7f2] p-5">
        <Header titulo="Catálogo de productos" volverA="/" />
        <View className="mb-4 flex-row items-center gap-2">
          <Link
            href="/products/form"
            className="min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-work-medium text-white"
          >
            <Ionicons name="add" size={18} color="white" />
            Añadir producto
          </Link>
          <Text className="flex-1 text-right text-xs text-slate-500">
            {productos.length} en catálogo
          </Text>
        </View>
        <View className="mb-3 flex-row items-center rounded-2xl border border-[#e5e9e1] bg-white px-3 shadow-sm">
          <Ionicons name="search-outline" size={20} color="#64748b" />
          <TextInput
            accessibilityLabel="Buscar en catálogo"
            placeholder="Buscar por nombre"
            placeholderTextColor="#94a3b8"
            value={busqueda}
            onChangeText={setBusqueda}
            className="min-h-12 flex-1 px-3 text-base text-slate-800"
          />
          {!!busqueda && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              onPress={() => setBusqueda("")}
              className="min-h-11 min-w-11 items-center justify-center"
            >
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </Pressable>
          )}
        </View>
        <Text
          accessibilityLiveRegion="polite"
          className="mb-3 text-xs text-slate-500"
        >
          {visibles.length}{" "}
          {visibles.length === 1 ? "resultado" : "resultados"}
        </Text>
        <View className="gap-4">
          {visibles.map((p) => (
            <View
              key={p.id}
              className="rounded-3xl border border-[#e8ece5] bg-white p-4 shadow-sm"
            >
              <View className="mb-3 flex-row items-center gap-3">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#f3f6ef] p-1">
                  <View className="w-full"><ProductImage producto={p} mini /></View>
                </View>
                <View className="flex-1">
                  <Text className="mb-1 self-start rounded-full bg-[#edf4eb] px-2 py-1 text-[10px] font-work-medium text-[#52745c]">
                    ID · {p.id}
                  </Text>
                  <Text className="text-base font-work-medium text-slate-800">
                    {p.nombre}
                  </Text>
                </View>
              </View>
              <ProductMetadata producto={p} />
              <PriceComparison precios={p.precios} variante="zip" />
              <Link
                href={{ pathname: "/products/detail", params: { id: p.id } }}
                className="mt-3 py-3 text-center text-teal-700"
              >
                Ver detalle de {p.nombre}
              </Link>
              <ListButton id={p.id} variante="zip" />
            </View>
          ))}
        </View>
        {!visibles.length && (
          <View className="items-center rounded-2xl border border-slate-100 bg-white p-6">
            <Ionicons name="search-outline" size={28} color="#94a3b8" />
            <Text className="mt-2 text-center font-work-medium text-slate-700">
              No encontramos productos
            </Text>
            <Text className="mt-1 text-center text-sm text-slate-500">
              Prueba con otro nombre o agrega un producto al catálogo.
            </Text>
          </View>
        )}
        <Text className="mt-4 text-center text-[11px] leading-4 text-slate-500">Precios en CLP; confirma valores y disponibilidad en cada supermercado.</Text>
      </View>
    </ScrollView>
  );
}
