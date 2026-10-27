import 'dotenv/config';
import { setTimeout as esperar } from 'node:timers/promises';

const api = process.env.API_URL ?? 'http://localhost:5000';
const web = process.env.WEB_URL ?? 'http://localhost:3000';
const limite = Date.now() + 120_000;
let ultimoError = '';
while (Date.now() < limite) {
  try {
    const salud = await fetch(new URL('/api/health', api), { signal: AbortSignal.timeout(4000) });
    const cuerpo = await salud.json();
    const interfaz = await fetch(new URL('/login', web), { signal: AbortSignal.timeout(4000) });
    if (salud.ok && cuerpo.status === 'ok' && cuerpo.db === 'up' && interfaz.ok) {
      console.log('API, base de datos e interfaz disponibles.');
      process.exit(0);
    }
    ultimoError = `API ${salud.status} / UI ${interfaz.status}`;
  } catch (error) { ultimoError = error.message; }
  await esperar(1500);
}
console.error(`El entorno no estuvo listo en 120 segundos: ${ultimoError}`);
process.exit(1);
