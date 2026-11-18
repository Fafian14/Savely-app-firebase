/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

function ejecutar(conflicto) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'savely-precios-'));
  const lib = path.join(carpeta, 'firebase-tools', 'lib');
  fs.mkdirSync(lib, { recursive: true });
  fs.writeFileSync(path.join(lib, 'auth.js'), "exports.getGlobalDefaultAccount=()=>({tokens:{refresh_token:'sesion-simulada'}});exports.getAccessToken=async()=>({access_token:'token-simulado'});");
  fs.writeFileSync(path.join(lib, 'scopes.js'), "exports.CLOUD_PLATFORM='cloud';exports.FIREBASE_PLATFORM='firebase';");
  const preload = path.join(carpeta, 'preload.cjs');
  fs.writeFileSync(preload, `
    const assert=require('node:assert/strict');
    const base='projects/savely-4f272/databases/(default)/documents/productos/';
    const timestamp='2026-11-17T00:00:00.000000Z';
    const documento={name:base+'1',updateTime:timestamp,fields:{id:{integerValue:'1'},nombre:{stringValue:'Leche'},descripcion:{stringValue:'Texto original con punto.'},precios:{mapValue:{fields:{lider:{integerValue:'990'},unimarc:{integerValue:'1090'},jumbo:{integerValue:'1000'},santaIsabel:{integerValue:'1000'}}}},preciosPrueba:{arrayValue:{values:[{stringValue:'jumbo'},{stringValue:'santaIsabel'}]}}}};
    const manual={name:base+'2',updateTime:timestamp,fields:{id:{integerValue:'2'},nombre:{stringValue:'Manual'},precios:{mapValue:{fields:{jumbo:{integerValue:'2500'}}}}}};
    global.fetch=async(url,options={})=>{
      if(options.method==='POST'){
        assert.equal(options.headers.Authorization,'Bearer token-simulado');
        const {writes}=JSON.parse(options.body);
        assert.equal(writes.length,1);
        assert.deepEqual(writes[0].updateMask.fieldPaths,['precios']);
        assert.deepEqual(writes[0].currentDocument,{updateTime:timestamp});
        assert.deepEqual(writes[0].updateTransforms,[{fieldPath:'actualizadoEn',setToServerValue:'REQUEST_TIME'}]);
        assert.deepEqual(Object.keys(writes[0].update.fields),['precios']);
        const p=writes[0].update.fields.precios.mapValue.fields;
        assert.equal(p.lider.integerValue,'990');assert.equal(p.unimarc.integerValue,'1090');
        assert.equal(p.jumbo.integerValue,'980');assert.equal(p.santaIsabel.integerValue,'1080');
        if(${JSON.stringify(conflicto)})return{ok:false,status:409,json:async()=>({error:{status:'FAILED_PRECONDITION',message:'El documento cambio'}})};
        documento.fields.precios=writes[0].update.fields.precios;
        return{ok:true,json:async()=>({writeResults:[{}]})};
      }
      return{ok:true,json:async()=>({documents:[documento,manual]})};
    };
  `);
  const respaldo = path.join(carpeta, 'respaldo.json');
  const resultado = spawnSync(process.execPath, ['--require', preload, path.join(__dirname, '../scripts/ajustar-precios-comparacion.cjs'), '--aplicar', '--firebase-cli', path.join(carpeta, 'firebase-tools'), '--respaldo', respaldo], { encoding: 'utf8', timeout: 20000 });
  try {
    assert.ok(fs.existsSync(respaldo));
    const previo = JSON.parse(fs.readFileSync(respaldo, 'utf8'));
    assert.equal(previo.documentos.length, 2);
    assert.equal(previo.documentos[0].fields.descripcion.stringValue, 'Texto original con punto.');
    assert.equal(previo.documentos[0].fields.precios.mapValue.fields.jumbo.integerValue, '1000');
    assert.doesNotMatch(JSON.stringify(previo), /token-simulado|sesion-simulada/);
    assert.doesNotMatch(resultado.stdout, /token-simulado|sesion-simulada/);
    return resultado;
  } finally {
    for (const archivo of [preload, respaldo, path.join(lib, 'auth.js'), path.join(lib, 'scopes.js')]) if (fs.existsSync(archivo)) fs.unlinkSync(archivo);
    fs.rmdirSync(lib);
    fs.rmdirSync(path.dirname(lib));
    fs.rmdirSync(carpeta);
  }
}

test('ajuste remoto: respaldo previo, actualización limitada a precios y preservación de datos', () => {
  const r = ejecutar(false);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /CONFIRMADO: 1 productos ajustados/);
});

test('ajuste remoto: un cambio concurrente detiene el lote sin anunciar éxito', () => {
  const r = ejecutar(true);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /FAILED_PRECONDITION/);
  assert.doesNotMatch(r.stdout, /CONFIRMADO/);
});
