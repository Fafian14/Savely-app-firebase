
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC0MEuneutIYQ7DaXbvdtuWBrB2Al345nw",
  authDomain: "savely-4f272.firebaseapp.com",
  projectId: "savely-4f272",
  storageBucket: "savely-4f272.firebasestorage.app",
  messagingSenderId: "652727769033",
  appId: "1:652727769033:web:e72517dab45e7a3305ba18",
  measurementId: "G-FLZ9SVKD6Y",
};

// Inicializar Firebase una sola vez
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// Base de datos Firestore
export const db = getFirestore(app);

// Autenticación de Firebase
export const auth = getAuth(app);

// Aplicación Firebase
export default app;
