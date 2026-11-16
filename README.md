# Savely

Expo SDK 54 / React Native / Expo Router / TypeScript / NativeWind.

## Catálogo conectado a Firestore

El catálogo compartido se lee de Cloud Firestore (`savely-4f272`), no del arreglo
estático. Crear, editar o eliminar desde la app confirma primero la operación en
Firebase. Los cambios se reciben en tiempo real en los demás dispositivos.
La app compara Líder, Unimarc, Jumbo y Santa Isabel. Inicio y Carrito incorporan el rediseño de la versión recibida, adaptado a Firebase.

### Datos guardados

| Ruta en Firestore | Contenido |
| --- | --- |
| `productos/{id}` | ID numérico, nombre, descripción, categoría, precios por supermercado, imagen, contenido, unidad, tamaño, oferta y fechas de creación/actualización. |
| `supermercados/{lider,unimarc,jumbo,santaIsabel}` | ID que coincide con la clave del precio, nombre, moneda CLP y distancia opcional. No se inventan distancias para las tiendas nuevas. |
| `configuracion/catalogo` | Versión de migración y contador del siguiente ID. |
| `migracionesCatalogo/{idDispositivo}` | Marca de importación local y equivalencias de IDs para conservar la lista personal. |

Ejemplo de producto (el ID del documento también es `1`):

```json
{
  "id": 1,
  "nombre": "Leche Entera",
  "descripcion": "Leche entera de 1 litro.",
  "categoria": "Alimentos",
  "precios": { "lider": 990, "unimarc": 1090 },
  "imagen": "leche",
  "contenido": 1,
  "unidad": "L",
  "tamano": "Caja",
  "oferta": "hoy"
}
```

Los precios son valores por producto en CLP. Las claves `lider`, `unimarc`, `jumbo` y `santaIsabel`
vinculan los precios con los documentos de supermercados. Las imágenes siguen
incluidas en la app; Firestore guarda su clave, no el archivo PNG.
El formulario exige al menos un precio escrito solo con dígitos (ejemplo: `1500`). Todos los campos de precio pueden quedar vacíos si el valor no se conoce. Un campo ausente muestra **Sin precio registrado**, no $0. Vaciar un precio al editar lo retira del documento remoto.
El contenido admite enteros o decimales con coma o punto (`500`, `1,5`, `0.5`).
No admite notación científica, hexadecimal ni separadores de miles; el formato
se comprueba antes de convertir a número y después se validan los rangos.
Las categorías, unidades y tipos de oferta siguen siendo opciones del formulario.
Las cuatro tiendas están soportadas. No hay administración de otras cadenas ni nuevas categorías. Un total por tienda solo se calcula si tiene precio para todos los productos; si no, muestra **Faltan precios**. El ahorro frente a una tienda única solo se estima cuando existe una referencia completa.
Las distancias y los precios iniciales son de demostración, sin GPS ni consulta de
precios comerciales. Cambiar la distancia de un supermercado en Firestore actualiza
los filtros de ofertas.

### Migración y datos anteriores

```sh
npm install
npm run firebase:migrate
npm start
```

`firebase:migrate` carga los 18 productos iniciales y los 4 supermercados. En una base existente añade las tiendas faltantes sin cambiar productos, precios ni el contador. También
se inicializan automáticamente al abrir la app. La migración es repetible: no
sobrescribe documentos existentes, no duplica productos y no repone los borrados,
incluso si se eliminó todo el catálogo. No borres `configuracion/catalogo` para
reiniciarlo: esa marca también impide que reaparezca la semilla.

Al abrir esta versión en un dispositivo con datos anteriores, se importan una vez
sus productos nuevos y sus ediciones. Una colisión con otra versión editada en la
nube conserva ambas asignando un ID nuevo a la copia local; la lista se remapea al
ID asignado. Los borrados locales anteriores no borran el catálogo compartido.
La clave antigua `savely.catalog.v1` se conserva intacta como respaldo.

La lista de compra es personal y sigue en AsyncStorage (`savely.lista.v2`). No se
comparte entre usuarios ni dispositivos, porque aún no existe inicio de sesión.
Los productos borrados dejan de aparecer también en la lista. Los filtros y la
selección de comparación son temporales.

La primera carga requiere conexión. No hay guardado offline del catálogo: una
transacción rechazada no se muestra como guardada. Si una sesión pierde conexión,
puede conservar en pantalla los últimos datos recibidos y mostrar el aviso.

### Usar la app

En Inicio abre **Explorar catálogo**. **Crear producto** guarda en Firestore;
**Administrar producto → Editar información** mantiene el ID; **Administrar producto → Eliminar producto** solicita confirmación y retira el documento.
El contador se actualiza en una transacción para evitar que dos altas concurrentes
usen el mismo ID. No uses IDs manuales mayores que el contador sin actualizarlo.
Los productos nuevos usan `/products/detail?id=ID` y `/products/form?id=ID`, rutas
compatibles con la exportación web estática.

La pantalla **Probar conexión a Firebase** (`/firebase`) conserva la demostración
del PDF, que envía un saludo a `users`. Esa colección no almacena el catálogo.
No se ejecutó `reset-project` ni se cambiaron las reglas de seguridad.
La cuenta cliente debe tener permisos para las cuatro rutas de catálogo indicadas.

El catálogo y el detalle utilizan el diseño del ZIP: tarjetas con ID, buscador
con botón para limpiar, imagen destacada y panel desplegable **Administrar
producto**. La lista de compra conserva la acción principal y los precios se
muestran con distintivos por supermercado. Solo estas dos pantallas utilizan
la variante visual del ZIP de los componentes compartidos de precio y lista;
las demás pantallas conservan su presentación actual y la misma lógica Firebase.

### Planificar la ruta

La sección **Ruta** utiliza los productos de tu lista y sus precios actuales de
Firestore. Distribuye la compra entre las tiendas seleccionadas con precios
registrados y permite ordenar las paradas. Si un producto no tiene precio en
ninguna tienda elegida, lo muestra como pendiente y bloquea la apertura de un
recorrido incompleto. Nunca trata un dato ausente como precio cero.

En **Origen y sucursales**, ingresa el punto de partida y la dirección completa
del local concreto de cada parada. Las direcciones deben incluir localidad,
separada por coma; también puedes pegar coordenadas en formato
`latitud,longitud`, con punto decimal y rangos -90..90 / -180..180. No hay un
origen fijo ni una sucursal predeterminada. La búsqueda de locales abre Maps
para consultar el lugar y copiar su dirección o coordenadas; la app no utiliza
GPS, autocompletado de Places ni geocodificación propia. Maps resuelve las
direcciones escritas; las coordenadas permiten señalar un punto exacto.

Puedes elegir **A pie**, **En auto** o **En bicicleta** y guardar las ubicaciones
en este dispositivo (`savely.ruta.ubicaciones.v1`). Al abrir Maps se usa el origen,
los destinos y el orden seleccionados. La vista de la app es esquemática; no
calcula ni promete la menor distancia y los precios no incluyen el traslado.
Confirma los puntos y disponibilidad antes de salir.

La lista y las ubicaciones son personales y locales; productos y precios están
en Firebase. No se comparte información personal entre dispositivos sin cuentas.
Los precios nuevos se registran manualmente en el formulario y no se obtienen
por cálculo, scraping ni una API comercial. Los precios iniciales conservan
su carácter de demostración. En **Ofertas cercanas** se omiten tiendas cuya
distancia no esté registrada; la configuración de Ruta no pretende medir GPS.

### Archivos principales

- `store/route-planner.ts`: distribución de la compra, orden de paradas y enlace a Maps.
- `app/route/index.tsx`: pantalla Ruta adaptada al catálogo remoto.
- `components/RouteLocations.tsx`: ingreso, validación y respaldo local de ubicaciones.
- `services/catalogo.ts`: migración, CRUD transaccional y suscripciones a Firestore.
- `store/CatalogProvider.tsx`: datos remotos, importación local y lista personal.
- `store/products.store.ts`, `supermarkets.store.ts`: semillas de la migración.
- `store/catalog.ts`: validaciones y transformaciones puras.
- `models/Product.ts`, `Supermarket.ts`: modelos de datos.
- `components/ProductForm.tsx`, `ProductDetail.tsx`: altas, ediciones y borrados.
- `store/product-comparison.ts`, `offers.ts`: cálculos y filtros.

### Verificación

```sh
npm test
npx tsc --noEmit
npm run lint
```

La suite incluye catálogo, cálculos, importación local, preservación de conflictos,
IDs, mensajes de error, cambios confirmados y desuscripción de listeners. Las
pruebas unitarias simulan Firestore y no modifican la nube.

La migración y el CRUD también se comprobaron contra Firebase real, incluyendo
la recepción de una edición por un segundo cliente. Los productos de prueba se
retiraron al finalizar; el contador puede tener saltos por esas altas.

Pendientes anteriores sin modificar: `reset-project` referencia un archivo que
no existe; ESLint puede mostrar advertencias en archivos generados de `.expo`.

Documentación de referencia: https://firebase.google.com/docs/firestore/manage-data/transactions


### Limpieza del proyecto

Se retiraron, con respaldo externo verificado, el código histórico, dos componentes sin uso, capturas antiguas y recursos alternativos no utilizados. La aplicación conserva su código vigente, pruebas, configuración, recursos referenciados y metadatos de procedencia de imágenes.
