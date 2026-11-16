import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import { useRef, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import RouteLocations from "@/components/RouteLocations";
import Header from "@/components/Header";
import ProductImage from "@/components/ProductImage";
import type { Precios, Supermercado } from "@/models/Product";
import { useCatalog } from "@/store/CatalogProvider";
import {
  crearEnlaceGoogleMaps,
  distribuirCompra,
  reordenarParadas,
  type ParadaRuta,
  type UbicacionesRuta,
} from "@/store/route-planner";
import { formatearPesos } from "@/store/product-comparison";



export default function RouteScreen() {
  const { productos, lista, supermercados } = useCatalog();
  const [tiendas, setTiendas] = useState<Supermercado[]>(supermercados.map((s) => s.nombre));
  const [abriendoMapa, setAbriendoMapa] = useState(false);
  const [errorMapa, setErrorMapa] = useState("");
  const abriendoActual = useRef(false);
  const [ubicaciones, setUbicaciones] = useState<UbicacionesRuta>({ origen: "", sucursales: {}, modo: "walking" });
  const productosLista = productos.filter((producto) =>
    lista.includes(producto.id),
  );
  const plan = distribuirCompra(productosLista, tiendas, supermercados);
  const paradas: ParadaRuta[] = tiendas
    .map((tienda) => ({
      tienda,
      productos: plan.porTienda[tienda],
      total: plan.totales[tienda],
    }))
    .filter((parada) => parada.productos.length > 0);

  function alternarTienda(tienda: Supermercado) {
    setErrorMapa("");
    setTiendas((actuales) =>
      actuales.includes(tienda)
        ? actuales.length > 1
          ? actuales.filter((actual) => actual !== tienda)
          : actuales
        : [...actuales, tienda],
    );
  }

  function moverParada(indice: number, direccion: -1 | 1) {
    setErrorMapa("");
    setTiendas((actuales) => reordenarParadas(
      actuales, paradas.map((parada) => parada.tienda), indice, direccion,
    ));
  }

  async function abrirGoogleMaps() {
    if (abriendoActual.current || !paradas.length || plan.sinPrecio.length) return;
    abriendoActual.current = true;
    setErrorMapa("");
    setAbriendoMapa(true);
    try {
      await Linking.openURL(
        crearEnlaceGoogleMaps(
          ubicaciones.origen,
          paradas.map((parada) => parada.tienda),
          ubicaciones.sucursales, ubicaciones.modo,
        ),
      );
    } catch (causa) {
      setErrorMapa(causa instanceof Error ? causa.message : "No pudimos abrir Google Maps. Inténtalo nuevamente.");
    } finally {
      abriendoActual.current = false;
      setAbriendoMapa(false);
    }
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="pb-6">
      <View className="mx-auto w-full max-w-2xl p-4">
        <Header titulo="Diseña tu ruta" />
        <Text className="mb-5 text-sm leading-5 text-slate-600">
          Organiza tus paradas y encuentra una mejor forma de hacer tus compras.
        </Text>

        {!productosLista.length ? (
          <View className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
            <View className="bg-teal-800 px-5 pb-6 pt-5">
              <View className="mb-4 self-start flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
                <Ionicons name="navigate" size={14} color="white" />
                <Text className="text-xs font-work-medium text-white">
                  TU COMPRA, MEJOR ORGANIZADA
                </Text>
              </View>
              <Text className="max-w-sm text-2xl font-work-black leading-8 text-white">
                Tu próxima compra empieza aquí
              </Text>
              <Text className="mt-2 text-sm leading-5 text-teal-50">
                Arma tu lista y descubre dónde conviene hacer cada parada.
              </Text>
              <RouteIllustration />
            </View>

            <View className="p-5">
              <View className="mb-5 flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-teal-50">
                  <Ionicons name="basket-outline" size={22} color="#0f766e" />
                </View>
                <View className="flex-1">
                  <Text className="font-work-medium text-slate-800">
                    Tu lista todavía está vacía
                  </Text>
                  <Text className="mt-1 text-xs leading-5 text-slate-500">
                    Agrega productos para preparar tu recorrido.
                  </Text>
                </View>
              </View>

              <View className="mb-5 gap-3">
                <RouteStep
                  numero="1"
                  titulo="Elige tus productos"
                  detalle="Agrégalos a tu lista de compra."
                  icono="cart-outline"
                />
                <RouteStep
                  numero="2"
                  titulo="Compara los precios"
                  detalle="Reparte tu compra entre los supermercados seleccionados."
                  icono="pricetag-outline"
                />
                <RouteStep
                  numero="3"
                  titulo="Sigue tu recorrido"
                  detalle="Abre las paradas en Google Maps."
                  icono="map-outline"
                />
              </View>

            <Link
              href="/products"
              className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-teal-700 p-4 text-center font-work-medium text-white active:bg-teal-800"
            >
              <Ionicons name="add-circle-outline" size={20} color="white" />
              Explorar productos
            </Link>
              <Link
                href="/cart"
                className="mt-2 min-h-11 flex-row items-center justify-center gap-1 rounded-xl p-3 text-center text-sm font-work-medium text-teal-800"
              >
                Ver mi carrito
                <Ionicons name="arrow-forward" size={15} color="#115e59" />
              </Link>
            </View>
          </View>
        ) : (
          <>
            <View className="mb-4 rounded-2xl bg-teal-800 p-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-sm text-teal-100">
                    {plan.sinPrecio.length ? "Subtotal de productos con precio" : "Total estimado de la ruta"}
                  </Text>
                  <Text className="mt-1 text-3xl font-work-black text-white">
                    {plan.total === 0 && plan.sinPrecio.length ? "Sin total completo" : formatearPesos(plan.total)}
                  </Text>
                </View>
                <View className="h-12 w-12 items-center justify-center rounded-full bg-white/15">
                  <Ionicons name="navigate" size={25} color="white" />
                </View>
              </View>
              <Text className="mt-3 text-sm leading-5 text-teal-50">
                {plan.ahorroVsTiendaUnica > 0
                  ? `Ahorras ${formatearPesos(plan.ahorroVsTiendaUnica)} frente a comprar todo en una sola tienda.`
                  : "Comparación de precios para los supermercados seleccionados."}
              </Text>
            </View>

            <Text className="mb-2 text-lg font-work-medium text-slate-800">
              ¿Qué supermercados visitarás?
            </Text>
            <Text className="mb-3 text-sm leading-5 text-slate-500">
              El precio más bajo de las tiendas elegidas asigna cada producto a
              una parada. Mantén al menos una seleccionada.
            </Text>
            <View className="mb-5 flex-row flex-wrap gap-3">
              {supermercados.map(({ nombre: tienda }) => {
                const seleccionada = tiendas.includes(tienda);
                return (
                  <Pressable
                    key={tienda}
                    accessibilityRole="button"
                    accessibilityLabel={`Incluir ${tienda} en la ruta`}
                    accessibilityState={{ selected: seleccionada, disabled: seleccionada && tiendas.length === 1 }}
                    disabled={seleccionada && tiendas.length === 1}
                    onPress={() => alternarTienda(tienda)}
                    className={`min-h-12 w-[48%] flex-row items-center justify-center gap-2 rounded-xl border px-3 ${seleccionada ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"}`}
                  >
                    <Ionicons
                      name={seleccionada ? "checkbox" : "square-outline"}
                      size={19}
                      color={seleccionada ? "#0f766e" : "#64748b"}
                    />
                    <Text className="font-work-medium text-slate-800">
                      {tienda}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!!plan.sinPrecio.length && <Text accessibilityRole="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-amber-900">
              Faltan precios de {plan.sinPrecio.map((p) => p.nombre).join(", ")} en las tiendas elegidas. Regístralos o selecciona otras tiendas para completar la ruta.
            </Text>}
            <RouteLocations ubicaciones={ubicaciones} paradas={paradas.map((p) => p.tienda)} onChange={(value) => { setUbicaciones(value); setErrorMapa(""); }} />
            <MapPreview paradas={paradas} origen={ubicaciones.origen || "Origen por configurar"} />
            <View className="mb-5 mt-4 flex-row items-start gap-2 rounded-xl bg-amber-50 p-3">
              <Ionicons
                name="information-circle-outline"
                size={19}
                color="#92400e"
              />
              <Text className="flex-1 text-xs leading-5 text-amber-900">
                Vista esquemática, no representa calles ni usa GPS. La ruta usa el origen y las sucursales que ingresaste. Confirma esas ubicaciones en Google Maps antes de salir.
              </Text>
            </View>

            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-work-medium text-slate-800">
                Paradas y productos
              </Text>
              <Text className="text-xs text-slate-500">
                {productosLista.length}{" "}
                {productosLista.length === 1 ? "producto" : "productos"}
              </Text>
            </View>
            <View className="gap-3">
              {paradas.map((parada, indice) => (
                <StopCard
                  key={parada.tienda}
                  parada={parada}
                  clavePrecio={supermercados.find((s) => s.nombre === parada.tienda)!.id}
                  indice={indice}
                  cantidad={paradas.length}
                  onMove={moverParada}
                />
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir ruta en Google Maps"
              disabled={abriendoMapa || plan.sinPrecio.length > 0}
              onPress={() => void abrirGoogleMaps()}
              className={`mt-5 min-h-14 flex-row items-center justify-center gap-2 rounded-xl px-4 ${abriendoMapa ? "bg-teal-500" : "bg-teal-700 active:bg-teal-800"}`}
            >
              <Ionicons name="map-outline" size={21} color="white" />
              <Text className="font-work-medium text-white">
                {abriendoMapa ? "Abriendo Google Maps…" : "Abrir ruta en Google Maps"}
              </Text>
            </Pressable>
            {!!errorMapa && (
              <Text
                accessibilityRole="alert"
                className="mt-3 text-center text-sm text-red-700"
              >
                {errorMapa}
              </Text>
            )}
            <Text className="mt-3 text-center text-xs leading-5 text-slate-500">
              Estimación con los precios del catálogo, sin costo de traslado.
              Confirma valores y disponibilidad en cada supermercado.
            </Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function RouteIllustration() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="mt-5 h-32 overflow-hidden rounded-2xl border border-white/15 bg-teal-700/70"
    >
      <View className="absolute -left-5 top-6 h-3 w-[115%] rotate-[-12deg] rounded-full bg-white/15" />
      <View className="absolute -left-4 top-[84px] h-3 w-[115%] rotate-[10deg] rounded-full bg-white/15" />
      <View className="absolute left-[31%] top-[-25%] h-[150%] w-3 rotate-[18deg] rounded-full bg-white/15" />
      <View className="absolute left-[70%] top-[-20%] h-[150%] w-3 rotate-[-15deg] rounded-full bg-white/15" />
      <View className="absolute left-[10%] top-[23%] h-7 w-12 rounded-lg bg-teal-500/60" />
      <View className="absolute left-[47%] top-[62%] h-7 w-14 rounded-lg bg-teal-500/60" />
      <View className="absolute left-[77%] top-[20%] h-7 w-12 rounded-lg bg-teal-500/60" />
      <View className="absolute left-[23%] top-[53%] h-[3px] w-[29%] rotate-[-14deg] rounded-full bg-amber-300" />
      <View className="absolute left-[52%] top-[47%] h-[3px] w-[25%] rotate-[13deg] rounded-full bg-amber-300" />
      <View className="absolute left-[13%] top-[42%] h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-800">
        <Ionicons name="navigate" size={14} color="white" />
      </View>
      <View className="absolute left-[47%] top-[25%] h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-700">
        <Text className="font-work-medium text-xs text-white">1</Text>
      </View>
      <View className="absolute left-[75%] top-[55%] h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-600">
        <Text className="font-work-medium text-xs text-white">2</Text>
      </View>
      <View className="absolute bottom-2 right-2 flex-row items-center gap-1 rounded-full bg-teal-900/50 px-2 py-1">
        <Ionicons name="location" size={12} color="white" />
        <Text className="text-[10px] text-white">Tu recorrido</Text>
      </View>
    </View>
  );
}

function RouteStep({
  numero,
  titulo,
  detalle,
  icono,
}: {
  numero: string;
  titulo: string;
  detalle: string;
  icono: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
        <Ionicons name={icono} size={19} color="#0f766e" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-work-medium text-slate-800">
          {numero}. {titulo}
        </Text>
        <Text className="mt-0.5 text-xs text-slate-500">{detalle}</Text>
      </View>
      <Ionicons name="checkmark-circle-outline" size={19} color="#cbd5e1" />
    </View>
  );
}

function MapPreview({ paradas, origen }: { paradas: ParadaRuta[]; origen: string }) {
  const posiciones = paradas.length === 1
    ? [{ left: "69%", top: "38%" }]
    : [
        { left: "46%", top: "20%" },
        { left: "74%", top: "38%" },
        { left: "60%", top: "67%" },
        { left: "27%", top: "48%" },
      ];

  return (
    <View
      accessibilityLabel={`Esquema de ruta desde ${origen} con ${paradas.length} paradas`}
      className="h-56 overflow-hidden rounded-3xl border border-teal-100 bg-[#e6f1e9]"
    >
      <View className="absolute -left-8 top-12 h-4 w-[120%] rotate-[-13deg] bg-white/80" />
      <View className="absolute -left-5 top-32 h-3 w-[120%] rotate-[12deg] bg-white/80" />
      <View className="absolute left-[27%] top-[-25%] h-[150%] w-3 rotate-[17deg] bg-white/80" />
      <View className="absolute left-[62%] top-[-20%] h-[145%] w-4 rotate-[-12deg] bg-white/80" />
      <View className="absolute left-[8%] top-[14%] h-10 w-16 rounded-xl bg-emerald-100/80" />
      <View className="absolute left-[34%] top-[67%] h-9 w-20 rounded-xl bg-emerald-100/80" />
      <View className="absolute left-[71%] top-[10%] h-10 w-16 rounded-xl bg-emerald-100/80" />
      <View className="absolute left-[16%] top-[58%] h-[3px] w-[39%] rotate-[-25deg] rounded-full bg-teal-700" />
      {paradas.length > 1 && (
        <View className="absolute left-[52%] top-[49%] h-[3px] w-[31%] rotate-[25deg] rounded-full bg-teal-700" />
      )}
      <View className="absolute left-[5%] top-[42%] items-center">
        <View className="h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-800">
          <Ionicons name="navigate" size={17} color="white" />
        </View>
        <Text className="mt-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-work-medium text-slate-700">
          Inicio
        </Text>
      </View>
      {paradas.map((parada, indice) => (
        <View
          key={parada.tienda}
          style={{
            left: posiciones[indice].left as `${number}%`,
            top: posiciones[indice].top as `${number}%`,
          }}
          className="absolute items-center"
        >
          <View
            className={`h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow ${parada.tienda === "Líder" ? "bg-blue-700" : "bg-red-600"}`}
          >
            <Text className="font-work-medium text-white">{indice + 1}</Text>
          </View>
          <Text className="mt-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-work-medium text-slate-700">
            {parada.tienda}
          </Text>
        </View>
      ))}
      <View className="absolute left-3 right-3 top-3 rounded-full bg-white/90 px-3 py-1.5">
        <Text numberOfLines={1} className="text-xs font-work-medium text-slate-700">
          {origen}
        </Text>
      </View>
    </View>
  );
}

function StopCard({
  parada,
  clavePrecio,
  indice,
  cantidad,
  onMove,
}: {
  parada: ParadaRuta;
  clavePrecio: keyof Precios;
  indice: number;
  cantidad: number;
  onMove: (indice: number, direccion: -1 | 1) => void;
}) {
  return (
    <View className="rounded-2xl border border-slate-100 bg-white p-4">
      <View className="mb-3 flex-row items-center">
        <View
          className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${parada.tienda === "Líder" ? "bg-blue-50" : "bg-red-50"}`}
        >
          <Text
            className={`font-work-medium ${parada.tienda === "Líder" ? "text-blue-700" : "text-red-700"}`}
          >
            {indice + 1}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-work-medium text-slate-800">
            {parada.tienda}
          </Text>
          <Text className="text-xs text-slate-500">
            {parada.productos.length}{" "}
            {parada.productos.length === 1
              ? "producto recomendado"
              : "productos recomendados"}
          </Text>
        </View>
        <View className="items-end">
          <Text className="font-work-medium text-slate-800">
            {formatearPesos(parada.total)}
          </Text>
          <Text className="text-[10px] text-slate-500">en esta parada</Text>
        </View>
        <View className="ml-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Subir parada ${parada.tienda}`}
            accessibilityState={{ disabled: indice === 0 }}
            disabled={indice === 0}
            onPress={() => onMove(indice, -1)}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-teal-50"
          >
            <Ionicons
              name="chevron-up"
              size={19}
              color={indice === 0 ? "#cbd5e1" : "#0f766e"}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Bajar parada ${parada.tienda}`}
            accessibilityState={{ disabled: indice === cantidad - 1 }}
            disabled={indice === cantidad - 1}
            onPress={() => onMove(indice, 1)}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-teal-50"
          >
            <Ionicons
              name="chevron-down"
              size={19}
              color={indice === cantidad - 1 ? "#cbd5e1" : "#0f766e"}
            />
          </Pressable>
        </View>
      </View>

      {parada.productos.length ? (
        <View className="gap-2 border-t border-slate-100 pt-3">
          {parada.productos.map((producto) => (
            <View key={producto.id} className="flex-row items-center gap-3">
              <View className="h-12 w-12 rounded-xl bg-slate-50">
                <ProductImage producto={producto} mini />
              </View>
              <Text className="flex-1 text-sm text-slate-700">
                {producto.nombre}
              </Text>
              <Text className="text-sm font-work-medium text-slate-800">
                {formatearPesos(
                  producto.precios[clavePrecio]!,
                )}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="border-t border-slate-100 pt-3 text-sm leading-5 text-slate-500">
          Ningún producto de la lista tiene aquí el precio más bajo.
        </Text>
      )}
    </View>
  );
}
