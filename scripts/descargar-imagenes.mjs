import { createWriteStream, createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';

const destino = process.argv[2];
const direccion = process.env.BOOKSTORE_IMAGES_URL;
const huellaEsperada = process.env.BOOKSTORE_IMAGES_SHA256?.toLowerCase();
if (!destino || !direccion || !/^[a-f0-9]{64}$/.test(huellaEsperada ?? '')) {
  throw new Error('Faltan el destino, BOOKSTORE_IMAGES_URL o BOOKSTORE_IMAGES_SHA256');
}
if (new URL(direccion).protocol !== 'https:') throw new Error('La descarga privada debe usar HTTPS');

try {
  // No imprimimos la URL porque contiene el permiso temporal de descarga.
  const respuesta = await fetch(direccion, { signal: AbortSignal.timeout(180_000), redirect: 'error' });
  if (!respuesta.ok || !respuesta.body) throw new Error(`Descarga HTTP ${respuesta.status}`);
  await pipeline(Readable.fromWeb(respuesta.body), createWriteStream(destino, { flags: 'wx' }));
  const hash = createHash('sha256');
  for await (const bloque of createReadStream(destino)) hash.update(bloque);
  if (hash.digest('hex') !== huellaEsperada) throw new Error('El SHA-256 del paquete no coincide');
  console.log('Paquete privado descargado y verificado.');
} catch {
  await unlink(destino).catch(() => {});
  throw new Error('No se pudo descargar o verificar el paquete privado. Revisa la URL y su SHA-256.');
}
