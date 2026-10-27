import 'dotenv/config';

function leerUrl(nombre: string, defecto: string): string {
  const valor = process.env[nombre] ?? defecto;
  const url = new URL(valor);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${nombre} debe ser HTTP o HTTPS`);
  return url.origin;
}

const espera = Number(process.env.TIMEOUT_MS ?? 15000);
if (!Number.isInteger(espera) || espera < 1000) throw new Error('TIMEOUT_MS debe ser un entero de al menos 1000');

export const configuracion = {
  api: leerUrl('API_URL', 'http://localhost:5000'),
  web: leerUrl('WEB_URL', 'http://localhost:3000'),
  espera,
  sinVentana: process.env.HEADLESS !== 'false',
  trazas: process.env.TRACE === 'true',
  canal: process.env.BROWSER_CHANNEL,
  carpetaEvidencia: process.env.EVIDENCIA_DIR || 'reports'
};
