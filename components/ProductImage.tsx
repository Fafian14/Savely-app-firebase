import { Image, View } from "react-native";

import type { Product } from "@/models/Product";

const IMAGEN_FALLBACK =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800";

export default function ProductImage({
  producto,
  grande = false,
  mini = false,
}: {
  producto: Product;
  grande?: boolean;
  mini?: boolean;
}) {
  const uri = producto.imagen?.trim() || IMAGEN_FALLBACK;

  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-xl bg-white ${mini ? "h-12" : grande ? "h-56 p-3" : "h-20 p-1"}`}
    >
      <Image
        source={{ uri }}
        accessibilityLabel={`Imagen del producto ${producto.nombre}`}
        resizeMode="contain"
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
}
