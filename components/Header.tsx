import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

export default function Header({
  titulo,
  volverA,
}: {
  titulo?: string;
  volverA?: Href;
}) {
  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace(volverA ?? "/");
  }
  return (
    <View className="mb-5">
      <View className="flex-row items-center gap-2">
        <Image
          source={require("../assets/images/savely-logo.png")}
          accessibilityLabel="Logo de Savely"
          resizeMode="contain"
          style={{ width: 48, height: 48 }}
        />
        <Text
          accessibilityRole={titulo ? "text" : "header"}
          className="flex-1 text-3xl font-work-black text-teal-700"
        >
          Savely
        </Text>
        <View className="rounded-full border border-teal-100 bg-teal-50 px-3 py-2">
          <Text className="text-xs font-work-medium text-teal-800">
            Líder · Unimarc
          </Text>
        </View>
      </View>
      <Text className="mt-1 text-sm text-slate-500">
        Compra mejor, ahorra más.
      </Text>
      {titulo && (
        <View className="mt-5 flex-row items-center gap-2">
          {volverA && (
            <Pressable
              onPress={volver}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              className="min-h-11 min-w-11 items-center justify-center rounded-full bg-teal-50"
            >
              <Ionicons name="arrow-back" size={24} color="#0f766e" />
            </Pressable>
          )}
          <Text
            accessibilityRole="header"
            className="flex-1 text-2xl font-work-medium text-slate-800"
          >
            {titulo}
          </Text>
        </View>
      )}
    </View>
  );
}
