// Permite ejecutar pruebas y utilidades TypeScript sin añadir otro compilador.
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (mod, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  mod._compile(output.outputText, filename);
};
