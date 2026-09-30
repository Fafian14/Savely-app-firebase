import { ScrollView, View } from "react-native";

import CategoryComparison from "@/components/CategoryComparison";
import Header from "@/components/Header";

export default function CategoriesScreen() {
  return (
    <ScrollView className="flex-1" contentContainerClassName="pb-6">
      <View className="mx-auto w-full max-w-2xl px-4 pt-4">
        <Header titulo="Mejor por categoría" volverA="/compare" />
        <CategoryComparison />
      </View>
    </ScrollView>
  );
}
