/**
 * DETALLE Y ACCIONES: busca un producto por el ID de la URL en el catálogo compartido.
 * Reutiliza imagen, metadatos, precios y botón de lista; permite editar, eliminar y comparar.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import ProductMetadata from "@/components/ProductMetadata";
import ListButton from "@/components/ListButton";
import { useCatalog } from "@/store/CatalogProvider";
import { Pressable, ScrollView, Text, View } from "react-native";

import ProductImage from "@/components/ProductImage";
import Header from "@/components/Header";
import PriceComparison from "@/components/PriceComparison";
import { mensajeErrorCatalogo } from "@/services/catalogo";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { productos, eliminar } = useCatalog();
  // find devuelve el producto o undefined; el JSX maneja ambas situaciones.
  const producto = productos.find((p) => String(p.id) === id);
  // La confirmación de borrado, el estado de operación y el error son estado local de la pantalla.
  const [confirmar, setConfirmar] = useState(false);
  const [administracionAbierta, setAdministracionAbierta] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  // Espera la eliminación persistida; catalog.ts también quita el ID de la lista.
  // Solo después vuelve al catálogo; si falla muestra error y finally libera el estado ocupado.
  async function borrar() {
    if (!producto) return;
    setOcupado(true);
    setError("");
    try {
      await eliminar(producto.id);
      router.replace("/products");
    } catch (causa) {
      setError(mensajeErrorCatalogo(causa));
    } finally {
      setOcupado(false);
    }
  }

  // La compra es la acción principal; las tareas de mantenimiento se agrupan como acciones secundarias.
  return (
    <ScrollView className="flex-1" contentContainerClassName="pb-6">
      <View className="mx-auto w-full max-w-xl px-5 pt-6">
        <Header titulo="Detalle del producto" volverA="/products" />
        {producto ? (
          <View className="rounded-3xl border border-[#e8ece5] bg-white p-5 shadow-sm">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-work-medium text-teal-800">
                {producto.categoria}
              </Text>
              {producto.oferta !== "ninguna" && (
                <View className="flex-row items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5">
                  <Ionicons name="pricetag" size={13} color="#b45309" />
                  <Text className="text-xs font-work-medium text-amber-800">
                    {producto.oferta === "hoy" ? "Oferta de hoy" : "Oferta semanal"}
                  </Text>
                </View>
              )}
            </View>
            <View className="overflow-hidden rounded-3xl bg-[#f5f7f2]">
              <ProductImage producto={producto} grande />
            </View>
            <Text
              accessibilityRole="header"
              className="mt-5 text-3xl font-work-medium text-slate-800"
            >
              {producto.nombre}
            </Text>
            <Text className="mt-1 text-sm text-slate-500">
              ID {producto.id} · {producto.tamano} · {producto.contenido} {producto.unidad}
            </Text>
            <View className="mt-5 rounded-3xl bg-[#f5f7f2] p-4">
              <Text className="mb-3 text-sm font-work-medium text-slate-800">
                Comparación de precios
              </Text>
              <PriceComparison precios={producto.precios} variante="zip" />
            </View>
            <View className="mt-4">
              <ProductMetadata producto={producto} />
            </View>
            <ListButton id={producto.id} variante="zip" />
            <Link
              href={{
                pathname: "/compare",
                params: { productoId: producto.id },
              }}
              asChild
            >
              <Pressable
                accessibilityRole="link"
                className="mt-3 min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-white p-3 active:bg-teal-50"
              >
                <Ionicons name="scale-outline" size={18} color="#0f766e" />
                <Text className="font-work-medium text-teal-800">
                  Comparar productos
                </Text>
              </Pressable>
            </Link>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Administrar producto"
              accessibilityState={{ expanded: administracionAbierta }}
              onPress={() => {
                setAdministracionAbierta((abierta) => !abierta);
                setConfirmar(false);
              }}
              className="mt-5 min-h-12 flex-row items-center justify-between border-t border-slate-100 px-1 pt-3"
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="settings-outline" size={17} color="#64748b" />
                <Text className="text-sm font-work-medium text-slate-600">
                  Administrar producto
                </Text>
              </View>
              <Ionicons
                name={administracionAbierta ? "chevron-up" : "chevron-down"}
                size={18}
                color="#64748b"
              />
            </Pressable>
            {administracionAbierta && (
              <View className="mt-2 gap-2">
                <Link
                  href={{
                    pathname: "/products/form",
                    params: { id: producto.id },
                  }}
                  asChild
                >
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Editar información"
                    className="min-h-12 flex-row items-center gap-3 rounded-xl bg-slate-50 px-3"
                  >
                    <Ionicons name="create-outline" size={18} color="#475569" />
                    <Text className="text-sm text-slate-700">
                      Editar información
                    </Text>
                  </Pressable>
                </Link>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar producto"
                  onPress={() => setConfirmar(true)}
                  className="min-h-12 flex-row items-center gap-3 rounded-xl bg-red-50 px-3"
                >
                  <Ionicons name="trash-outline" size={18} color="#b91c1c" />
                  <Text className="text-sm text-red-700">Eliminar producto</Text>
                </Pressable>
              </View>
            )}
            {confirmar && (
              <View className="mt-3 rounded-xl bg-red-50 p-4">
                <Text className="text-slate-800">
                  ¿Eliminar {producto.nombre}? También se quitará de tu lista.
                  Esta acción no se puede deshacer.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={ocupado}
                  onPress={() => void borrar()}
                  className="mt-3 min-h-12 items-center justify-center rounded-xl bg-red-700 p-3"
                >
                  <Text className="text-white">
                    {ocupado ? "Eliminando…" : "Confirmar eliminación"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={ocupado}
                  onPress={() => setConfirmar(false)}
                  className="min-h-12 items-center justify-center p-3"
                >
                  <Text className="text-slate-700">Cancelar</Text>
                </Pressable>
                {!!error && (
                  <Text accessibilityRole="alert" className="text-red-700">
                    {error}
                  </Text>
                )}
              </View>
            )}
          </View>
        ) : (
          <View className="rounded-2xl bg-white p-6">
            <Text
              accessibilityRole="header"
              className="text-center text-xl font-work-medium text-slate-800"
            >
              Producto no encontrado
            </Text>
            <Link
              href="/products"
              className="mt-4 rounded-xl bg-teal-700 p-4 text-center font-work-medium text-white"
            >
              Explorar catálogo
            </Link>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
