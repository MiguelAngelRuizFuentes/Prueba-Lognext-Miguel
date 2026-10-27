require('dotenv').config({ quiet: true });
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');

const trabajadores = Number(process.env.PARALELO ?? 3);
if (!Number.isInteger(trabajadores) || trabajadores < 0 || trabajadores > 8) {
  throw new Error('PARALELO debe ser un entero entre 0 y 8');
}
const carpeta = process.env.EVIDENCIA_DIR || 'reports';
mkdirSync(carpeta, { recursive: true });

module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['dist/soporte/**/*.js', 'dist/pasos/**/*.js'],
    format: ['progress', `html:${join(carpeta, 'cucumber.html')}`, `json:${join(carpeta, 'cucumber.json')}`, `junit:${join(carpeta, 'junit.xml')}`],
    parallel: trabajadores,
    retry: 0,
    strict: true,
    publish: false
  }
};
