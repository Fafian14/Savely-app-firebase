import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import type { Supermercado } from "@/models/Product";
import { supermercados } from "@/models/Product";
import { validarUbicacion, type UbicacionesRuta, type ModoViaje } from "@/store/route-planner";

const clave = "savely.ruta.ubicaciones.v1";
export default function RouteLocations({ ubicaciones, paradas, onChange }: {
  ubicaciones: UbicacionesRuta;
  paradas: Supermercado[];
  onChange: (value: UbicacionesRuta) => void;
}) {
  const [cargado, setCargado] = useState(false);
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    let activo = true;
    void AsyncStorage.getItem(clave).then((texto) => {
      if (!activo || !texto) return;
      const value = JSON.parse(texto) as UbicacionesRuta;
      if (!value || typeof value.origen !== "string" || value.origen.length > 200 ||
        !["walking", "driving", "bicycling"].includes(value.modo) || !value.sucursales || typeof value.sucursales !== "object" || Array.isArray(value.sucursales) ||
        Object.entries(value.sucursales).some(([nombre, direccion]) => !supermercados.some((s) => s.nombre === nombre) || typeof direccion !== "string" || direccion.length > 200))
        throw new Error("Las ubicaciones guardadas no son válidas.");
      onChange(value);
    }).catch(() => { if (activo) setAviso("No pudimos leer las ubicaciones guardadas. Puedes ingresarlas nuevamente."); })
      .finally(() => { if (activo) setCargado(true); });
    return () => { activo = false; };
    // Solo restaura al montar: escribir no debe volver a cargar el respaldo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar() {
    setAviso("");
    const error = validarUbicacion(ubicaciones.origen);
    if (error) { setAviso("Origen: " + error); return; }
    for (const tienda of paradas) {
      const causa = validarUbicacion(ubicaciones.sucursales[tienda] ?? "");
      if (causa) { setAviso(`Sucursal ${tienda}: ${causa}`); return; }
    }
    setGuardando(true);
    try {
      await AsyncStorage.setItem(clave, JSON.stringify(ubicaciones));
      setAviso("Ubicaciones guardadas en este dispositivo.");
    } catch { setAviso("No se pudieron guardar las ubicaciones. Inténtalo nuevamente."); }
    finally { setGuardando(false); }
  }
  return <View className="mb-5 gap-3 rounded-2xl border border-slate-100 bg-white p-4">
    <Text className="text-lg font-work-medium text-slate-800">Origen y sucursales</Text>
    <Text className="text-sm leading-5 text-slate-600">Ingresa una dirección con ciudad, por ejemplo Calle 123, Ciudad, Chile; o coordenadas como -36.82,-73.05. Elige el local concreto que visitarás.</Text>
    <Text className="font-work-medium text-slate-700">Punto de partida</Text>
    <TextInput accessibilityLabel="Origen de la ruta" value={ubicaciones.origen} editable={cargado} maxLength={200}
      onChangeText={(origen) => { setAviso(""); onChange({ ...ubicaciones, origen }); }}
      placeholder="Dirección completa o latitud,longitud" className="min-h-12 rounded-xl border border-slate-200 p-3 text-slate-800" />
    <View className="flex-row flex-wrap gap-2">
      {([{ id: "walking", nombre: "A pie" }, { id: "driving", nombre: "En auto" }, { id: "bicycling", nombre: "En bicicleta" }] as { id: ModoViaje; nombre: string }[]).map((modo) =>
        <Pressable key={modo.id} accessibilityRole="button" accessibilityLabel={modo.nombre} accessibilityState={{ selected: ubicaciones.modo === modo.id }}
          disabled={!cargado} onPress={() => onChange({ ...ubicaciones, modo: modo.id })}
          className={`min-h-11 justify-center rounded-xl border px-3 ${ubicaciones.modo === modo.id ? "border-teal-600 bg-teal-50" : "border-slate-200"}`}>
          <Text className="text-teal-800">{modo.nombre}</Text>
        </Pressable>)}
    </View>
    {paradas.map((tienda) => <View key={tienda} className="gap-2">
      <Text className="font-work-medium text-slate-700">Sucursal {tienda}</Text>
      <TextInput accessibilityLabel={`Sucursal ${tienda}`} value={ubicaciones.sucursales[tienda] ?? ""} editable={cargado} maxLength={200}
        onChangeText={(direccion) => { setAviso(""); onChange({ ...ubicaciones, sucursales: { ...ubicaciones.sucursales, [tienda]: direccion } }); }}
        placeholder="Dirección del local o coordenadas exactas" className="min-h-12 rounded-xl border border-slate-200 p-3 text-slate-800" />
      <Pressable accessibilityRole="button" accessibilityLabel={`Buscar sucursal ${tienda} en Maps`} className="min-h-11 justify-center"
        onPress={() => { void Linking.openURL("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(tienda + " supermercado " + ubicaciones.origen)).catch(() => setAviso("No pudimos abrir la búsqueda de sucursales.")); }}>
        <Text className="text-sm text-teal-700">Buscar local en Google Maps</Text>
      </Pressable>
    </View>)}
    <Text className="text-xs leading-5 text-slate-500">Puedes buscar el local en Maps y copiar aquí su dirección o coordenadas. No usamos GPS ni elegimos sucursales automáticamente.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Guardar ubicaciones" disabled={!cargado || guardando} onPress={() => void guardar()} className="min-h-12 items-center justify-center rounded-xl bg-teal-50 p-3">
      <Text className="font-work-medium text-teal-800">{guardando ? "Guardando…" : "Guardar ubicaciones en este dispositivo"}</Text>
    </Pressable>
    {!!aviso && <Text accessibilityLiveRegion="polite" className="text-sm text-slate-700">{aviso}</Text>}
  </View>;
}
