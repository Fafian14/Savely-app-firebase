/**
 * FORMULARIO CONTROLADO REUTILIZABLE: crea o edita según la prop producto.
 * Los campos viven en useState y la operación guardar procede del contexto compartido.
 */
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import type { Product, ProductInput, ImagenProducto } from "@/models/Product";
import { categorias } from "@/store/products.store";
import { limitesContenido, ofertas, unidades, validarProducto } from "@/store/catalog";
import { useCatalog } from "@/store/CatalogProvider";
import ProductImage from "./ProductImage";
import { elegirImagen, opcionesImagen } from "@/store/product-images";
import { mensajeErrorCatalogo } from "@/services/catalogo";
import { formatearContenido, parsearCamposNumericos } from "@/store/product-form";
import { validarCaracteresCampo } from "@/store/input-validation";

export default function ProductForm({ producto }: { producto?: Product }) {
  const { guardar, supermercados } = useCatalog();
  // El encadenamiento opcional ?. y ?? cargan los datos al editar o valores iniciales al crear.
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? "");
  const [tamano, setTamano] = useState(producto?.tamano ?? "");
  const [contenido, setContenido] = useState(producto ? formatearContenido(producto.contenido) : "");
  const [lider, setLider] = useState(String(producto?.precios.lider ?? ""));
  const [unimarc, setUnimarc] = useState(
    String(producto?.precios.unimarc ?? ""),
  );
  const [jumbo, setJumbo] = useState(String(producto?.precios.jumbo ?? ""));
  const [santaIsabel, setSantaIsabel] = useState(String(producto?.precios.santaIsabel ?? ""));
  const [categoria, setCategoria] = useState<Product["categoria"]>(
    producto?.categoria ?? "Alimentos",
  );
  const [unidad, setUnidad] = useState<Product["unidad"]>(
    producto?.unidad ?? "g",
  );
  const [oferta, setOferta] = useState<Product["oferta"]>(
    producto?.oferta ?? "hoy",
  );
  // Si no hay una elección manual, el nombre y categoría sugieren una imagen local.
  const [imagenElegida, setImagenElegida] = useState<ImagenProducto | null>(producto?.imagen ?? null);
  const [mostrarImagenes, setMostrarImagenes] = useState(false);
  const imagen = imagenElegida ?? elegirImagen(nombre, categoria);
  // Estado de presentación: error muestra un mensaje y ocupado bloquea entradas mientras se guarda.
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  // Describe campos para dibujarlos con map; cada uno enlaza value con su función de actualización.
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
      label: `Precio en ${supermercados.find((s) => s.id === "lider")!.nombre}`,
      value: lider,
      set: setLider,
      max: 9,
      numeric: true,
    },
    {
      label: `Precio en ${supermercados.find((s) => s.id === "unimarc")!.nombre}`,
      value: unimarc,
      set: setUnimarc,
      max: 9,
      numeric: true,
    },
    { label: "Precio en Jumbo", value: jumbo, set: setJumbo, max: 9, numeric: true },
    { label: "Precio en Santa Isabel", value: santaIsabel, set: setSantaIsabel, max: 9, numeric: true },
  ];
  // Construye ProductInput, valida, espera el almacenamiento y navega al detalle si tiene éxito.
  async function guardarCambios() {
    const numeros = parsearCamposNumericos({ contenido, lider, unimarc, jumbo, santaIsabel });
    if (!numeros.valido) {
      setError(numeros.error);
      return;
    }
    const input: ProductInput = {
      nombre,
      imagen,
      descripcion,
      tamano,
      // El formato escrito ya fue comprobado antes de convertir a número.
      contenido: numeros.contenido,
      unidad,
      categoria,
      oferta,
      precios: numeros.precios,
      ...(producto?.preciosPrueba !== undefined ? { preciosPrueba: producto.preciosPrueba.filter((clave) => numeros.precios[clave] === producto.precios[clave]) } : {}),
    };
    // Una validación fallida interrumpe el guardado antes de tocar el almacenamiento.
    const mensaje = validarProducto(input);
    if (mensaje) {
      setError(mensaje);
      return;
    }
    setOcupado(true);
    setError("");
    // try captura el fallo de la promesa; finally libera ocupado tanto en éxito como en error.
    try {
      const id = await guardar(input, producto?.id);
      // Reemplaza el formulario para que volver no reabra una operación de guardado ya terminada.
      router.replace({ pathname: "/products/detail", params: { id } });
    } catch (causa) {
      setError(mensajeErrorCatalogo(causa));
    } finally {
      setOcupado(false);
    }
  }
  // Los campos usan value/onChangeText. map genera las opciones de categoría, unidad y oferta.
  // El teclado numérico facilita escribir, pero validarProducto aplica las reglas reales.
  // El botón muestra Guardando y queda deshabilitado según ocupado; el error se anuncia como alerta.
  return (
    <View className="gap-4 rounded-2xl border border-slate-100 bg-white p-4">
      <Text className="text-sm leading-5 text-slate-500">
        Registra al menos un precio. Deja vacío el de cualquier tienda donde no conozcas el valor. Ingresa precios en pesos sin puntos
        ni separadores. En contenido puedes usar coma o punto decimal, por
        ejemplo 1,5 o 0.5. Compara el mismo producto y contenido en todas las tiendas.
      </Text>
      {/* La misma imagen se guarda con el producto y se presenta en todas las pantallas. */}
      <View className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <Text className="text-base font-work-medium text-slate-800">Imagen del producto</Text>
        <ProductImage producto={{ imagen, nombre }} grande />
        <Text className="mb-3 text-center text-sm text-slate-600">
          {opcionesImagen.find((opcion) => opcion.clave === imagen)?.nombre}
          {imagenElegida === null ? " · Sugerida según el producto" : " · Seleccionada"}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: mostrarImagenes }}
          disabled={ocupado}
          onPress={() => setMostrarImagenes((valor) => !valor)}
          className="min-h-12 items-center justify-center rounded-xl bg-white p-3"
        >
          <Text className="font-work-medium text-teal-700">
            {mostrarImagenes ? "Cerrar imágenes" : "Cambiar imagen"}
          </Text>
        </Pressable>
        {mostrarImagenes && (
          <View className="mt-3 flex-row flex-wrap justify-between gap-y-2">
            {opcionesImagen.map((opcion) => (
              <Pressable
                key={opcion.clave}
                accessibilityRole="button"
                accessibilityLabel={`Usar imagen de ${opcion.nombre}`}
                accessibilityState={{ selected: imagen === opcion.clave }}
                disabled={ocupado}
                onPress={() => { setImagenElegida(opcion.clave); setMostrarImagenes(false); }}
                className={`w-[31%] rounded-xl border p-2 ${imagen === opcion.clave ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"}`}
              >
                <ProductImage producto={{ imagen: opcion.clave, nombre: opcion.nombre }} mini />
                <Text className="mt-1 text-center text-xs text-slate-700">{opcion.nombre}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {imagenElegida !== null && (
          <Pressable disabled={ocupado} accessibilityRole="button" onPress={() => setImagenElegida(null)} className="min-h-11 items-center justify-center p-2">
            <Text className="text-sm text-teal-700">Usar imagen sugerida</Text>
          </Pressable>
        )}
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
          {!!validarCaracteresCampo(c.value, c.numeric ? c.label === "Contenido" ? "contenido" : "precio" : "texto") && (
            <Text accessibilityRole="alert" className="mt-1 text-sm text-red-700">
              {c.label}: {validarCaracteresCampo(c.value, c.numeric ? c.label === "Contenido" ? "contenido" : "precio" : "texto")}
            </Text>
          )}
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
      <Text className="text-sm text-slate-600">
        Contenido máximo: {limitesContenido[unidad]} {unidad}.{unidad === "ud" ? " Usa unidades enteras, sin fracciones." : " Se permiten decimales."} Precio máximo por tienda: $500.000.
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
        simuladas; el ahorro compara los precios registrados.
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
// Botón auxiliar: selected cambia su estilo, disabled impide interacción y onPress modifica el campo.
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
