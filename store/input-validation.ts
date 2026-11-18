// Letras Unicode conservan tildes y ñ; solo contenido admite un separador decimal.
export function validarCaracteresCampo(texto: string, tipo: "texto" | "precio" | "contenido"): string | null {
  if (!texto) return null;
  const patron = tipo === "texto" ? /^[\p{L}\p{M}\p{N} ]+$/u
    : tipo === "contenido" ? /^[0-9]*(?:[.,][0-9]*)?$/ : /^[0-9]+$/;
  if (patron.test(texto)) return null;
  return tipo === "precio" ? "No se permiten caracteres especiales. Usa solo dígitos."
    : "No se permiten caracteres especiales.";
}
