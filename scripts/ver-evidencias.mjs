import { createServer } from 'node:http';
import { mkdir, readFile, readdir, realpath, stat } from 'node:fs/promises';
import { resolve, relative, extname, sep } from 'node:path';

const puerto = Number(process.env.PUERTO_EVIDENCIAS ?? 8765);
if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new Error('PUERTO_EVIDENCIAS debe ser un puerto válido');
const raiz = resolve('evidencia');
await mkdir(raiz, { recursive: true });
const raizReal = await realpath(raiz);
const escapar = valor => String(valor).replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]);
const tipos = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webm': 'video/webm', '.zip': 'application/zip', '.txt': 'text/plain; charset=utf-8' };

const servidor = createServer(async (peticion, respuesta) => {
  try {
    if (!['GET', 'HEAD'].includes(peticion.method)) { respuesta.writeHead(405); respuesta.end(); return; }
    const ruta = decodeURIComponent(new URL(peticion.url, 'http://localhost').pathname);
    if (ruta === '/') {
      const carpetas = (await readdir(raizReal, { withFileTypes: true })).filter(entrada => entrada.isDirectory());
      const ejecuciones = [];
      for (const carpeta of carpetas) {
        try {
          const archivo = resolve(raizReal, carpeta.name, 'index.html');
          const datos = await stat(archivo);
          ejecuciones.push({ nombre: carpeta.name, fecha: datos.mtimeMs });
        } catch { /* Aún no hay informe completo en esta carpeta. */ }
      }
      ejecuciones.sort((a, b) => b.fecha - a.fecha);
      const lista = ejecuciones.map(item => `<li><a href="/${encodeURIComponent(item.nombre)}/index.html">${escapar(item.nombre)}</a></li>`).join('');
      const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Historial de evidencias</title><style>body{font:16px system-ui,sans-serif;max-width:850px;margin:45px auto;padding:0 20px;background:#f4f6fa;color:#192334}section{background:white;border:1px solid #d9e1ec;border-radius:10px;padding:20px}li{padding:8px}a{color:#1749a0}</style></head><body><h1>Historial de evidencias</h1><p>Selecciona una ejecución para consultar todos sus casos.</p><section>${lista ? `<ul>${lista}</ul>` : '<p>Aún no hay ejecuciones completas.</p>'}</section></body></html>`;
      respuesta.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      respuesta.end(peticion.method === 'HEAD' ? undefined : html);
      return;
    }
    const archivo = await realpath(resolve(raizReal, `.${ruta}`));
    const diferencia = relative(raizReal, archivo);
    if (diferencia === '..' || diferencia.startsWith(`..${sep}`) || resolve(raizReal, diferencia) !== archivo) { respuesta.writeHead(403); respuesta.end(); return; }
    const contenido = await readFile(archivo);
    respuesta.writeHead(200, { 'Content-Type': tipos[extname(archivo).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    respuesta.end(peticion.method === 'HEAD' ? undefined : contenido);
  } catch (error) {
    respuesta.writeHead(error.code === 'ENOENT' ? 404 : 400);
    respuesta.end('No se ha encontrado el informe solicitado.');
  }
});
servidor.on('error', error => { console.error(`No se pudo iniciar el visor: ${error.message}`); process.exitCode = 1; });
servidor.listen(puerto, '127.0.0.1', () => {
  console.log(`Visor de evidencias: http://127.0.0.1:${puerto}`);
  console.log('Para detener el visor pulsa Ctrl+C.');
});
