import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { iniciarAdministracion } from "@/services/admin";

export default function AdminAccess({ onAuthorized, onCancel }: { onAuthorized: () => void; onCancel?: () => void }) {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const bloqueo = useRef(false);
  async function ingresar() {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setError("");
    try {
      await iniciarAdministracion(correo, contrasena);
      setContrasena("");
      onAuthorized();
    } catch (causa) {
      setContrasena("");
      setError(causa instanceof Error ? causa.message : "No pudimos verificar el acceso.");
    } finally { bloqueo.current = false; setOcupado(false); }
  }
  return <View className="my-3 gap-3 rounded-2xl border border-teal-200 bg-white p-4">
    <Text className="text-lg font-work-medium text-slate-800">Acceso de administrador</Text>
    <Text className="text-sm text-slate-600">Ingresa tus credenciales para añadir, editar o eliminar productos. El acceso dura cinco minutos.</Text>
    <TextInput accessibilityLabel="Correo de administrador" value={correo} onChangeText={setCorreo} editable={!ocupado}
      autoCapitalize="none" autoCorrect={false} keyboardType="email-address" maxLength={254}
      placeholder="Correo de administrador" className="min-h-12 rounded-xl border border-slate-300 p-3 text-slate-800" />
    <TextInput accessibilityLabel="Contraseña de administrador" value={contrasena} onChangeText={setContrasena} editable={!ocupado}
      secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={128}
      placeholder="Contraseña de administrador" className="min-h-12 rounded-xl border border-slate-300 p-3 text-slate-800" />
    {!!error && <Text accessibilityRole="alert" className="text-red-700">{error}</Text>}
    <Pressable accessibilityRole="button" disabled={ocupado} onPress={() => void ingresar()} className="min-h-12 items-center justify-center rounded-xl bg-teal-700 p-3">
      <Text className="font-work-medium text-white">{ocupado ? "Verificando…" : "Ingresar como administrador"}</Text>
    </Pressable>
    {onCancel && <Pressable accessibilityRole="button" disabled={ocupado} onPress={onCancel} className="min-h-11 items-center justify-center"><Text className="text-slate-700">Cancelar acceso</Text></Pressable>}
  </View>;
}
