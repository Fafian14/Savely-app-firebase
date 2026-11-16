/**
 * PANTALLA INICIO: ruta /. Combina encabezado, ofertas y resúmenes por categoría.
 * La pantalla deriva sus valores del catálogo compartido para reflejar altas, ediciones y eliminaciones.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import CategoryIcon from "@/components/CategoryIcon";
import Header from "@/components/Header";
import LocalOffers from "@/components/LocalOffers";
import { useCatalog } from "@/store/CatalogProvider";
import { calcularAhorroCompra, formatearPesos, resumirCategoria } from "@/store/product-comparison";
import { categorias } from "@/store/products.store";

export default function HomeScreen() {
  // Lee el catálogo actual del contexto, no directamente la semilla de products.store.
  const { productos, lista } = useCatalog();
  const productosLista = productos.filter((producto) => lista.includes(producto.id));
  const planAhorro = calcularAhorroCompra(productosLista);

  // ScrollView permite desplazamiento; max-w-2xl limita el ancho en web.
  // LocalOffers reúne filtros y banner. Las categorías usan map y key para generar enlaces únicos.
  // resumirCategoria calcula el ahorro de comprar la categoría completa en una tienda.
  return (
    <ScrollView className="flex-1 bg-[#f5f7f2]" contentContainerClassName="pb-8">
      <View className="mx-auto w-full max-w-2xl px-5 pt-5">
        <Header />
        <View className="mb-5 overflow-hidden rounded-3xl bg-[#254b38] p-5">
          <View className="mb-3 self-start flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
            <Ionicons name="sparkles-outline" size={14} color="#e8f2e7" />
            <Text className="text-[11px] font-work-medium tracking-wide text-white">PLANIFICA Y AHORRA</Text>
          </View>
          <Text className="text-2xl font-work-black leading-8 text-white">
            Tu compra, mejor organizada.
          </Text>
          <Text className="mt-2 text-sm leading-5 text-[#e1eee3]">
            {productosLista.length > 0
              ? `Tienes ${productosLista.length} ${productosLista.length === 1 ? "producto" : "productos"}. Compara el total y prepara tus paradas.`
              : "Arma tu lista, compara supermercados y descubre dónde conviene comprar."}
          </Text>
          {productosLista.length > 0 && (
            <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
              <View className="flex-1 pr-2">
                <Text className="text-xs text-[#e1eee3]">{planAhorro.totalUnaTienda === null ? "Faltan precios para comparar la compra completa" : "Ahorro estimado al combinar tiendas"}</Text>
                <Text className="mt-1 text-2xl font-work-black text-white">
                  {planAhorro.totalUnaTienda === null ? "—" : formatearPesos(planAhorro.ahorro)}
                </Text>
              </View>
              <Ionicons name="trending-down" size={26} color="#d7efb5" />
            </View>
          )}
          <Link
            href={productosLista.length > 0 ? "/route" : "/products"}
            className="mt-4 min-h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-[#e2efcf] p-3 text-center font-work-medium text-[#254b38]"
          >
            <Ionicons name={productosLista.length > 0 ? "map-outline" : "basket-outline"} size={18} color="#254b38" />
            {productosLista.length > 0 ? "Ver estrategia y recorrido" : "Crear mi lista de compra"}
            <Ionicons name="arrow-forward" size={16} color="#254b38" />
          </Link>
          <Text className="mt-2 text-center text-[10px] leading-4 text-[#d6e5d8]">
            Estimación con precios de demostración · No incluye costo de traslado
          </Text>
        </View>
        <LocalOffers />
        <Link
          href="/products"
          className="mt-4 min-h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-[#e7f1e9] p-3 text-center font-work-medium text-[#286344]"
        >
          <Ionicons name="search-outline" size={17} color="#0f766e" />
          Explorar catálogo
        </Link>
        <View className="mb-3 mt-5 flex-row items-center justify-between gap-2">
          <Text
            accessibilityRole="header"
            className="flex-1 text-lg font-work-medium text-slate-800"
          >
            Mejor por categoría
          </Text>
          <Link href="/compare/categories" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Ver todas las categorías"
              className="min-h-11 justify-center"
            >
              <Text className="text-xs font-work-medium text-teal-700">
                Ver todas ›
              </Text>
            </Pressable>
          </Link>
        </View>
        <View className="overflow-hidden rounded-3xl border border-[#e8ece5] bg-white">
          {categorias.map((categoria) => {
            const categoriaResumen = resumirCategoria(productos, categoria);
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
                  className="min-h-16 flex-row items-center gap-3 border-b border-[#edf0eb] px-4 py-3 active:bg-[#f5f8f3]"
                >
                  <CategoryIcon categoria={categoria} />
                  <Text className="flex-1 text-sm font-work-medium text-slate-800">
                    {categoria}
                  </Text>
                  <Text className="text-xs text-teal-700">
                    Ahorras {formatearPesos(categoriaResumen.ahorro)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#64748b" />
                </Pressable>
              </Link>
            );
          })}
        </View>
        <Link href="/firebase" className="mt-4 py-3 text-center text-sm text-teal-700">Probar conexión a Firebase</Link>
        <Text className="mt-4 text-center text-xs leading-5 text-slate-500">
          Precios registrados · Una unidad de cada producto · Valores en CLP
        </Text>
      </View>
    </ScrollView>
  );
}
