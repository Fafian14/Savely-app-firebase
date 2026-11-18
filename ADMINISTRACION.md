# Activar la administración antes de distribuir el APK

El catálogo se puede consultar sin iniciar sesión. Añadir, editar y
eliminar productos requiere correo, contraseña y un rol de administrador. No existe una
contraseña universal dentro de la app.

1. En Firebase Console abre el proyecto `savely-4f272`.
2. Authentication → Comenzar (si aparece) → Sign-in method → Correo electrónico/contraseña → habilitar Correo electrónico/contraseña.
3. Authentication → Users → Agregar usuario. Introduce tu correo de administrador
   y una contraseña que solo conozcas tú. No compartas la contraseña en el chat.
4. Copia el UID del usuario creado.
5. Firestore Database → Datos → Crear colección `administradores`. Crea un
   documento cuyo ID sea exactamente ese UID. Añade `activo` de tipo booleano con
   valor `true`. Solo una persona con acceso a la consola debe administrar estos roles.
6. Antes de publicar reglas, conserva una copia de las reglas anteriores y verifica
   que existen `configuracion/catalogo` (inicializado=true, version=1, siguienteId
   mayor que todos los IDs), los productos y los cuatro supermercados. La
   inicialización o migración de una base vacía no forma parte del arranque público.
7. Firestore Database → Reglas: reemplaza el contenido con `firestore.rules` de este
   proyecto y pulsa Publicar. Alternativamente, desde PowerShell, usa Firebase CLI
   con tu cuenta autorizada:

   ```powershell
   Set-Location "D:\Savely-Movil-main"
   npx.cmd firebase-tools login
   npx.cmd firebase-tools deploy --only firestore:rules --project savely-4f272
   ```

Las reglas deben publicarse para impedir escrituras desde fuera de la app. El
diálogo de contraseña por sí solo no protege una base con reglas abiertas.
Los archivos de reglas incluidos están preparados para revisar y publicar; no se
despliegan automáticamente al compilar con Expo.

8. Prueba en la app: Añadir producto o Administrar producto → correo y contraseña → crear, editar o eliminar.
   Una contraseña errónea o una cuenta sin documento de rol activo debe fallar.
   Comprueba además que un usuario sin sesión puede consultar productos,
   pero no crear, editar, borrar ni crear su propio rol. El acceso de la app vence a los
   cinco minutos y se vuelve a comprobar el rol al guardar o eliminar.

Las descripciones antiguas con puntuación se pueden consultar. Al editarlas, el
formulario exige corregir los caracteres especiales antes de guardar. La app no
reescribe documentos antiguos automáticamente. Las migraciones locales antiguas
que intenten modificar el catálogo compartido ahora necesitan administración;
conserva su respaldo y migra antes de publicar estas reglas si aún existen.

## Precios de demostración

Por autorización del usuario, los precios faltantes se completan con $1.000 de
prueba, conservando los precios existentes. El campo `preciosPrueba` enumera las
tiendas con valores de demostración y la app los identifica. Esto no certifica un
precio real. Al cambiar un precio desde el formulario se retira su marca de prueba.
Para confirmar un precio real que coincida con el valor de prueba, el administrador
debe retirar también la tienda del campo `preciosPrueba` en la consola.

`scripts/precios-prueba.cjs` consulta sin escribir por defecto. Solo escribe con
`--aplicar --respaldo RUTA.json`; primero guarda un respaldo nuevo y nunca
reemplaza precios existentes. Si ya se publicaron reglas, requiere acceso de
administrador al servidor; no abras las reglas para ejecutarlo.

`datos/precios-pendientes.csv` permite recopilar los precios reales posteriormente.
Una celda vacía significa desconocido, nunca cero. Puedes registrar cada precio
desde Administrar producto una vez activado el acceso.
