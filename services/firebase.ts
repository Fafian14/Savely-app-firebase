import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebaseconfig";

// Mismo documento y colección que el ejemplo de la guía.
export async function crearDocumento(): Promise<string> {
  const docRef = await addDoc(collection(db, "users"), {
    tituloMensaje: "Saludos Firebase",
    mensaje: "Hola Mundo",
  });
  return docRef.id;
}

export function mensajeErrorFirebase(error: unknown): string {
  const codigo =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code).replace(/^firestore\//, "")
      : "";
  switch (codigo) {
    case "permission-denied":
      return "Firestore rechazó la escritura. Revisa los permisos de la colección users en Firebase Console.";
    case "unauthenticated":
      return "Firestore requiere autenticación para crear el documento.";
    case "unavailable":
    case "deadline-exceeded":
      return "No pudimos conectar con Firebase. Revisa tu conexión a internet.";
    case "not-found":
      return "No se encontró la base de datos. Crea Cloud Firestore en el proyecto savely-4f272.";
    default:
      return `No se pudo crear el documento${codigo ? ` (${codigo})` : ""}. Inténtalo nuevamente.`;
  }
}
