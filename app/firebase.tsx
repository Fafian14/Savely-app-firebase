import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Header from "@/components/Header";
import { crearDocumento, mensajeErrorFirebase } from "@/services/firebase";

export default function FirebaseScreen() {
  const [ocupado, setOcupado] = useState(false);
  const [documentoId, setDocumentoId] = useState("");
  const [error, setError] = useState("");
  const enviando = useRef(false);

  async function enviar() {
    // Impide dos envíos incluso antes del siguiente render.
    if (enviando.current) return;
    enviando.current = true;
    setOcupado(true);
    setDocumentoId("");
    setError("");
    try {
      const id = await crearDocumento();
      setDocumentoId(id);
      console.info("Documento creado en users con ID:", id);
    } catch (causa) {
      console.error("Error al crear documento en Firebase:", causa);
      setError(mensajeErrorFirebase(causa));
    } finally {
      enviando.current = false;
      setOcupado(false);
    }
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="pb-8">
      <View className="mx-auto w-full max-w-2xl p-4">
        <Header titulo="Conexión a Firebase" volverA="/" />
        <View className="gap-4 rounded-2xl border border-slate-100 bg-white p-5">
          <Text className="text-lg font-work-medium text-slate-800">
            Crear documento de prueba
          </Text>
          <Text className="leading-6 text-slate-600">
            Envía un saludo a Firebase y comprueba que se guardó correctamente.
            Cada envío crea un documento nuevo.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: ocupado, busy: ocupado }}
            disabled={ocupado}
            onPress={() => void enviar()}
            className="min-h-12 items-center justify-center rounded-xl bg-teal-700 p-4"
          >
            <Text className="font-work-medium text-white">
              {ocupado ? "Enviando…" : "Crear documento"}
            </Text>
          </Pressable>
          {ocupado && (
            <Text accessibilityLiveRegion="polite" className="text-slate-600">
              Esperando confirmación de Firebase. Se necesita conexión a internet.
            </Text>
          )}
          {!!documentoId && (
            <View accessibilityLiveRegion="polite" className="gap-2 rounded-xl bg-teal-50 p-4">
              <Text className="font-work-medium text-teal-800">
                Documento guardado en Firebase.
              </Text>
              <Text selectable className="text-teal-800">ID: {documentoId}</Text>
            </View>
          )}
          {!!error && (
            <Text accessibilityRole="alert" className="text-red-700">{error}</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
