import { ScrollView, View } from "react-native";
import Header from "@/components/Header";
import LocalOffers from "@/components/LocalOffers";
export default function OffersScreen() {
  return (
    <ScrollView contentContainerClassName="pb-6">
      <View className="mx-auto w-full max-w-2xl p-4">
        <Header titulo="Ofertas" />
        <LocalOffers />
      </View>
    </ScrollView>
  );
}
