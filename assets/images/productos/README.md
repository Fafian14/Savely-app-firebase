# Imagen compartida

`manzana.jpg` es la foto entregada por el usuario, conservada sin modificaciones.
Los 18 productos usan el identificador `manzana` en `store/products.store.ts`.
`components/ProductImage.tsx` lo asocia con este asset mediante un `require`
estático y muestra la misma imagen en Inicio y Detalle, con `resizeMode="contain"`.

Para sustituir la foto de todos los productos, reemplaza este JPG manteniendo su
nombre. El fondo cuadriculado forma parte del archivo original.