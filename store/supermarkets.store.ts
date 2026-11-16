import type { Supermarket } from "../models/Supermarket";

// Solo se usan al inicializar Firestore y en pruebas; la app lee los documentos.
export const supermercadosIniciales: Supermarket[] = [
  { id: "lider", nombre: "Líder", moneda: "CLP", distancia: 0.4 },
  { id: "unimarc", nombre: "Unimarc", moneda: "CLP", distancia: 1.1 },
  { id: "jumbo", nombre: "Jumbo", moneda: "CLP" },
  { id: "santaIsabel", nombre: "Santa Isabel", moneda: "CLP" },
];
