import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import type { Product, ProductInput } from "@/models/Product";
import { categorias } from "@/store/products.store";
import { ofertas, unidades, validarProducto } from "@/store/catalog";
import { useCatalog } from "@/store/CatalogProvider";

export default function ProductForm({ producto }: { producto?: Product }) {
  const { guardar } = useCatalog();
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? "");
  const [tamano, setTamano] = useState(producto?.tamano ?? "");
  const [imagen, setImagen] = useState(producto?.imagen ?? "");
  const [contenido, setContenido] = useState(String(producto?.contenido ?? ""));
  const [lider, setLider] = useState(String(producto?.precios.lider ?? ""));
  const [unimarc, setUnimarc] = useState(
    String(producto?.precios.unimarc ?? ""),
  );
  const [categoria, setCategoria] = useState<Product["categoria"]>(
    producto?.categoria ?? "Alimentos",
  );
  const [unidad, setUnidad] = useState<Product["unidad"]>(
    producto?.unidad ?? "g",
  );
  const [oferta, setOferta] = useState<Product["oferta"]>(
    producto?.oferta ?? "hoy",
  );
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const campos = [
    { label: "Nombre", value: nombre, set: setNombre, max: 100 },
    { label: "Detalles", value: descripcion, set: setDescripcion, max: 1000 },
    { label: "Tamaño o presentación", value: tamano, set: setTamano, max: 80 },
    {
      label: "Contenido",
      value: contenido,
      set: setContenido,
      max: 12,
      numeric: true,
    },
    {
      label: "Precio en Líder",
      value: lider,
      set: setLider,
      max: 9,
      numeric: true,
    },
    {
      label: "Precio en Unimarc",
      value: unimarc,
      set: setUnimarc,
      max: 9,
      numeric: true,
    },
  ];
  async function guardarCambios() {
    const input: ProductInput = {
      nombre,
      descripcion,
      tamano,
      imagen,
      contenido: Number(contenido.replace(",", ".")),
      unidad,
      categoria,
      oferta,
      precios: { lider: Number(lider), unimarc: Number(unimarc) },
    };
    const mensaje = validarProducto(input);
    if (mensaje) {
      setError(mensaje);
      return;
    }
    setOcupado(true);
    setError("");
    try {
      const id = await guardar(input, producto?.id);
      router.replace({ pathname: "/products/detail", params: { id } });
    } catch {
      setError(
        "No se pudo guardar el producto. Verifica el almacenamiento e inténtalo nuevamente.",
      );
    } finally {
      setOcupado(false);
    }
  }
  return (
    <View className="gap-4 rounded-2xl border border-slate-100 bg-white p-4">
      <Text className="text-sm leading-5 text-slate-500">
        Todos los campos son obligatorios. Ingresa precios en pesos sin puntos
        ni separadores. Ambos supermercados venden el mismo contenido.
      </Text>
      <View>
        <Text className="mb-2 text-sm font-work-medium text-slate-800">
          URL de la imagen
        </Text>
        <TextInput
          accessibilityLabel="URL de la imagen"
          value={imagen}
          onChangeText={setImagen}
          editable={!ocupado}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://ejemplo.com/imagen.jpg"
          className="min-h-12 rounded-xl border border-slate-200 px-3 py-3 text-base text-slate-800"
        />
        <Text className="mt-1 text-xs text-slate-500">
          Puedes pegar la URL de cualquier imagen pública. Al editar, cambia este campo para reemplazarla.
        </Text>
      </View>
      {campos.map((c) => (
        <View key={c.label}>
          <Text className="mb-2 text-sm font-work-medium text-slate-800">
            {c.label}
          </Text>
          <TextInput
            accessibilityLabel={c.label}
            value={c.value}
            onChangeText={c.set}
            editable={!ocupado}
            maxLength={c.max}
            keyboardType={c.numeric ? "decimal-pad" : "default"}
            multiline={c.label === "Detalles"}
            className="min-h-12 rounded-xl border border-slate-200 px-3 py-3 text-base text-slate-800"
          />
        </View>
      ))}
      <Text className="text-sm font-work-medium text-slate-800">Categoría</Text>
      <View className="flex-row flex-wrap gap-2">
        {categorias.map((c) => (
          <Option
            key={c}
            label={c}
            selected={categoria === c}
            disabled={ocupado}
            onPress={() => setCategoria(c)}
          />
        ))}
      </View>
      <Text className="text-sm font-work-medium text-slate-800">
        Unidad del contenido
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {unidades.map((u) => (
          <Option
            key={u}
            label={u}
            selected={unidad === u}
            disabled={ocupado}
            onPress={() => setUnidad(u)}
          />
        ))}
      </View>
      <Text className="text-sm font-work-medium text-slate-800">
        Oferta de demostración
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {ofertas.map((o) => (
          <Option
            key={o}
            label={
              o === "hoy"
                ? "Hoy"
                : o === "semana"
                  ? "Esta semana"
                  : "Sin oferta"
            }
            selected={oferta === o}
            disabled={ocupado}
            onPress={() => setOferta(o)}
          />
        ))}
      </View>
      <Text className="text-xs leading-5 text-slate-500">
        “Hoy” también aparece en Esta semana. Las fechas y distancias son
        simuladas; el ahorro compara los dos supermercados.
      </Text>
      {!!error && (
        <Text accessibilityRole="alert" className="text-red-700">
          {error}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={ocupado}
        onPress={() => void guardarCambios()}
        className="min-h-12 items-center justify-center rounded-xl bg-teal-700 p-4"
      >
        <Text className="font-work-medium text-white">
          {ocupado ? "Guardando…" : "Guardar producto"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={ocupado}
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/products")
        }
        className="min-h-12 items-center justify-center p-3"
      >
        <Text className="text-teal-700">Cancelar</Text>
      </Pressable>
    </View>
  );
}
function Option({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      aria-pressed={selected}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-11 items-center justify-center rounded-xl border px-3 py-2 ${selected ? "border-teal-700 bg-teal-700" : "border-slate-200 bg-white"}`}
    >
      <Text className={selected ? "text-white" : "text-slate-700"}>
        {label}
      </Text>
    </Pressable>
  );
}
