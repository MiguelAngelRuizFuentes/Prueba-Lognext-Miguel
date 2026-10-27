import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { generarInformes } from './informes.mjs';

const fecha = new Date();
const dos = valor => String(valor).padStart(2, '0');
const nombre = `${dos(fecha.getDate())}-${dos(fecha.getMonth() + 1)}-${fecha.getFullYear()}_${dos(fecha.getHours())}-${dos(fecha.getMinutes())}-${dos(fecha.getSeconds())}`;
mkdirSync('evidencia', { recursive: true });

// Si coinciden dos ejecuciones en el mismo segundo, cada una conserva su carpeta.
let carpeta;
for (let numero = 1; numero <= 999; numero++) {
  const sufijo = numero === 1 ? '' : `-${dos(numero)}`;
  const candidata = join('evidencia', `${nombre}${sufijo}`);
  try {
    mkdirSync(candidata);
    carpeta = candidata;
    break;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}
if (!carpeta) throw new Error('No se pudo crear una carpeta única para la ejecución');

console.log(`Evidencias de esta ejecución: ${carpeta}`);
const comando = join(process.cwd(), 'node_modules', '@cucumber', 'cucumber', 'bin', 'cucumber.js');
const proceso = spawn(process.execPath, [comando, ...process.argv.slice(2)], {
  env: { ...process.env, EVIDENCIA_DIR: carpeta },
  stdio: 'inherit'
});
const resultado = await new Promise(resolve => {
  proceso.on('error', error => resolve({ codigo: 1, error: error.message }));
  proceso.on('exit', (codigo, señal) => resolve({ codigo: codigo ?? 1, señal }));
});

try {
  if (!existsSync(join(carpeta, 'cucumber.json'))) {
    throw new Error('Cucumber no ha generado el archivo de resultados');
  }
  const resumen = generarInformes(carpeta, fecha);
  console.log(`Informes: ${carpeta}/index.html · ${resumen.total} casos · ${resumen.correctos} correctos · ${resumen.fallidos} fallidos · ${resumen.otros} pendientes o no ejecutados`);
  console.log('Para verlos en el navegador ejecuta: npm run evidencias');
} catch (error) {
  writeFileSync(join(carpeta, 'error-informe.txt'), `No se pudieron generar los informes individuales: ${error.message}\n`, 'utf8');
  console.error(`No se pudieron generar los informes individuales: ${error.message}`);
  process.exitCode = 1;
}
// El código de salida sigue reflejando el resultado real de Cucumber.
if (resultado.error) console.error(`No se pudo iniciar Cucumber: ${resultado.error}`);
if (resultado.señal) console.error(`Ejecución interrumpida: ${resultado.señal}`);
if (resultado.codigo !== 0) process.exitCode = resultado.codigo;
