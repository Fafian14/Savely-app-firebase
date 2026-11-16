require('./register-typescript.cjs');
const { inicializarCatalogo } = require('../services/catalogo.ts');
const { db } = require('../firebaseconfig.ts');
const { collection, getDocsFromServer, terminate } = require('firebase/firestore');
const timeout = setTimeout(() => {
  console.error('No se recibió confirmación de Firebase. Puedes repetir la migración sin duplicar productos.');
  process.exit(2);
}, 45000);
(async () => {
  try {
    await inicializarCatalogo();
    for (const nombre of ['productos', 'supermercados']) {
      const datos = await getDocsFromServer(collection(db, nombre));
      console.log(`${nombre}: ${datos.size} documentos confirmados por el servidor.`);
    }
    console.log('Migración terminada. Los documentos existentes se conservaron.');
  } catch (error) {
    console.error('No se completó la migración:', error.code || '', error.message);
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
    await terminate(db);
  }
})();
