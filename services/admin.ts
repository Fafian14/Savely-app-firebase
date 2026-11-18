import { inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDocFromServer } from "firebase/firestore";
import { auth, db } from "../firebaseconfig";

let validoHasta = 0;
const duracion = 5 * 60 * 1000;

export async function exigirAdministrador(): Promise<void> {
  const usuario = auth.currentUser;
  if (!usuario || Date.now() >= validoHasta) throw new Error("Ingresa la contraseña de administrador para continuar.");
  const rol = await getDocFromServer(doc(db, "administradores", usuario.uid));
  if (!rol.exists() || rol.data().activo !== true) {
    validoHasta = 0;
    throw new Error("Esta cuenta no tiene permisos de administrador.");
  }
}

export async function iniciarAdministracion(correo: string, contrasena: string): Promise<void> {
  validoHasta = 0;
  if (!correo.trim() || !contrasena) throw new Error("Ingresa el correo y la contraseña de administrador.");
  try {
    // Ni contraseña ni sesión persistente se almacenan en el dispositivo.
    await setPersistence(auth, inMemoryPersistence);
    await signInWithEmailAndPassword(auth, correo.trim(), contrasena);
    validoHasta = Date.now() + duracion;
    await exigirAdministrador();
  } catch (error) {
    validoHasta = 0;
    await signOut(auth).catch(() => undefined);
    const codigo = (error as { code?: string }).code;
    if (codigo === "auth/too-many-requests") throw new Error("Demasiados intentos. Espera antes de volver a intentarlo.");
    if (codigo === "auth/network-request-failed") throw new Error("No pudimos verificar el acceso. Revisa tu conexión.");
    if (codigo === "auth/operation-not-allowed" || codigo === "auth/configuration-not-found")
      throw new Error("El acceso de administrador aún no está configurado.");
    if (codigo) throw new Error("No se pudo autorizar el acceso. Revisa las credenciales y los permisos.");
    throw error;
  }
}

export function administracionVigente(): boolean {
  return !!auth.currentUser && Date.now() < validoHasta;
}

export async function cerrarAdministracion(): Promise<void> {
  validoHasta = 0;
  await signOut(auth);
}
