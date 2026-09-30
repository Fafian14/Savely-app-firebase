import { useLocalSearchParams } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import Header from "@/components/Header";
import ProductForm from "@/components/ProductForm";
import { useCatalog } from "@/store/CatalogProvider";

export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { productos } = useCatalog();
  const producto = productos.find((p) => String(p.id) === id);
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="pb-8"
      >
        <View className="mx-auto w-full max-w-2xl p-4">
          <Header
            titulo={id ? "Editar producto" : "Crear producto"}
            volverA="/products"
          />
          {id && !producto ? (
            <Text className="text-slate-700">Producto no encontrado.</Text>
          ) : (
            <ProductForm key={id ?? "nuevo"} producto={producto} />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
