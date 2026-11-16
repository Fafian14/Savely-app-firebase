import type { Precios } from "../models/Product";

interface CamposNumericos {
  contenido: string;
  lider: string;
  unimarc: string;
  jumbo?: string;
  santaIsabel?: string;
}

type ResultadoNumerico =
  | { valido: true; contenido: number; precios: Precios }
  | { valido: false; error: string };

// Revisa el texto original antes de Number: convertir primero ocultaría formatos
// como 0x10, 1e3 o el precio 1.000. validarProducto aplica después los rangos.
export function parsearCamposNumericos(campos: CamposNumericos): ResultadoNumerico {
  if (!/^[0-9]+(?:[.,][0-9]+)?$/.test(campos.contenido)) {
    return {
      valido: false,
      error: "El contenido debe ser un número decimal, por ejemplo 1,5 o 0.5, sin separadores de miles.",
    };
  }
  const precios: Precios = {};
  for (const [clave, tienda] of [["lider", "Líder"], ["unimarc", "Unimarc"], ["jumbo", "Jumbo"], ["santaIsabel", "Santa Isabel"]] as const) {
    const texto = campos[clave] ?? "";
    if (texto === "") continue;
    if (!/^[0-9]+$/.test(texto)) return {
      valido: false, error: `El precio en ${tienda} debe contener solo dígitos, por ejemplo 1500, sin puntos ni comas.`,
    };
    precios[clave] = Number(texto);
  }
  if (!Object.keys(precios).length) return { valido: false, error: "Registra al menos un precio para el producto." };
  return { valido: true, contenido: Number(campos.contenido.replace(",", ".")), precios };

}

// String(0.0000001) produce "1e-7". Al editar, conserva el formato decimal que
// el formulario admite, sin redondear ni perder contenidos pequeños ya guardados.
export function formatearContenido(valor: number): string {
  const [coeficiente, exponente] = String(valor).split("e-");
  if (!exponente) return coeficiente;
  return "0." + "0".repeat(Number(exponente) - 1) + coeficiente.replace(".", "");
}
