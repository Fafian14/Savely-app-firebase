# Savely

Expo SDK 54 / React Native / Expo Router / TypeScript / NativeWind.

Solo Líder y Unimarc, con datos ficticios locales.

## Secciones

Inicio, Comparar, Ofertas, Carrito y Ruta (pendiente). El catálogo permite crear,
editar, eliminar y elegir una imagen local desde el formulario.

## Datos y persistencia

`store/products.store.ts` es la semilla de 18 productos: 6 Alimentos y 3 en cada
una de las otras cuatro categorías. `store/CatalogProvider.tsx` comparte el estado
actual y lo guarda en AsyncStorage (dependencia ya instalada), clave `savely.catalog.v1`.
El catálogo y la lista se conservan al reiniciar o recargar, por dispositivo/origen web.
No hay sincronización entre dispositivos. Los filtros y la selección de comparación
son temporales. Se actualiza la UI después de una escritura exitosa; las escrituras
se serializan. Un error de lectura no reemplaza los datos guardados.

Los productos creados usan `/products/detail?id=ID` y la edición `/products/form?id=ID`.
Estas rutas fijas funcionan también al recargar productos nuevos en una exportación
web estática. Los antiguos enlaces `/products/1` siguen disponibles.


## Archivos principales

- `models/Product.ts`: modelo ampliado y tipo del formulario.
- `store/catalog.ts`: validaciones, altas, cambios, eliminación y lectura validada.
- `store/CatalogProvider.tsx`: estado compartido y almacenamiento local.
- `store/product-comparison.ts`, `store/offers.ts`: cálculo y filtrado sin UI.
- `components/ProductForm.tsx`, `ProductDetail.tsx`, `ProductMetadata.tsx`,
  `ListButton.tsx`: formularios, detalle, contenido/precio por unidad y lista.
- `components/SavingsBanner.tsx`: presentación reutilizable de valores dinámicos.
- `components/LocalOffers.tsx`: conecta filtros y catálogo con banner/supermercados.
- `app/products/index.tsx`, `form.tsx`, `detail.tsx`: rutas del CRUD.
- Inicio, Comparar, categorías, Ofertas, Carrito y layout consumen el mismo catálogo.
## Conexión a Firebase (guía)

Firebase JS SDK ya está instalado. `firebaseconfig.ts` inicializa una sola app
para el proyecto `savely-4f272` y exporta `db` (Cloud Firestore).
`services/firebase.ts` usa `addDoc(collection(db, "users"), ...)`, como la guía.
No se usa Analytics web en React Native.

1. Ejecuta `npm start` desde `D:\Savely-Movil-main`.
2. En Inicio, abre **Probar conexión a Firebase** (ruta `/firebase`).
3. Pulsa **Crear documento**. Espera la confirmación con el ID generado.
4. En Firebase Console, proyecto `savely-4f272`, abre Firestore Database > Datos >
   `users`. El documento contiene `tituloMensaje: "Saludos Firebase"` y
   `mensaje: "Hola Mundo"`. Cada pulsación confirmada crea un nuevo documento.

La base Cloud Firestore `(default)` debe existir y sus reglas deben permitir
esta creación. La pantalla muestra el error si los permisos la rechazan.
No cambia las reglas ni crea una base desde el cliente. Si necesitas configurar
los permisos de esta demostración, permite solamente `create` en `/users/{id}`
validando exactamente esos dos campos y valores; conserva las reglas del resto
de tu base. No habilites lectura/escritura global para resolver un error.

Esta integración reproduce el envío de prueba del PDF. El catálogo y el carrito
siguen en AsyncStorage; no se migran ni sincronizan con Firestore.
No se ejecutó `reset-project`, para conservar la aplicación existente.

Referencia técnica: https://firebase.google.com/docs/firestore/manage-data/add-data

## Pruebas automatizadas de Firebase

Después de `npm install`, ejecuta desde la raíz del proyecto:

```sh
node --require ./tests/register-ts.cjs --test store/catalog.test.ts store/product-comparison.test.ts tests/firebase.test.cjs
npx tsc --noEmit
npm run lint
```

Las 26 pruebas de catálogo, cálculos y servicio Firebase pasan. Las pruebas del
servicio simulan Firestore: verifican el documento enviado, la espera de
confirmación y el manejo de errores sin escribir nuevos datos en la nube.
También se comprobó por separado una escritura y lectura reales en Firestore.

Hallazgos pendientes de autorización para corregir:
- `npm run reset-project` apunta a `scripts/reset-project.js`, que no existe.
- ESLint advierte sobre dependencias de hooks en dos pantallas de `legacy` y,
  si está presente, una directiva innecesaria en `.expo/types/router.d.ts`.
