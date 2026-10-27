import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]);
const nombreSeguro = nombre => nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'caso';
const textoEstado = { passed: 'Correcto', failed: 'Fallido', skipped: 'No ejecutado', pending: 'Pendiente', undefined: 'Pendiente', ambiguous: 'Fallido', unknown: 'Desconocido' };

function estadoCaso(pasos) {
  const estados = pasos.map(paso => paso.result?.status ?? 'unknown');
  if (estados.some(estado => ['failed', 'ambiguous'].includes(estado))) return 'failed';
  if (estados.some(estado => ['pending', 'undefined', 'unknown'].includes(estado))) return 'pending';
  const visibles = pasos.filter(paso => !paso.hidden);
  if (visibles.length && visibles.every(paso => paso.result?.status === 'skipped')) return 'skipped';
  if (estados.some(estado => estado === 'skipped')) return 'skipped';
  return 'passed';
}

const estilos = `
  :root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#192334;background:#f4f6fa}
  body{max-width:1120px;margin:0 auto;padding:32px 22px 64px;line-height:1.55}
  h1{font-size:1.8rem;margin:0 0 8px}h2{font-size:1.2rem;margin:26px 0 12px}
  .sub{color:#526278;margin:0 0 20px}.panel{background:#fff;border:1px solid #d9e1ec;border-radius:10px;padding:20px;margin:16px 0}
  .resumen{display:flex;gap:12px;flex-wrap:wrap}.dato{background:#fff;border:1px solid #d9e1ec;border-radius:8px;padding:12px 18px}
  table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:11px;border-bottom:1px solid #e5eaf1;vertical-align:top}
  th{font-size:.9rem;color:#526278}a{color:#1749a0;text-decoration:none}a:hover{text-decoration:underline}
  .estado{display:inline-block;padding:3px 9px;border-radius:5px;font-weight:600;white-space:nowrap}
  .passed{background:#e0f5e6;color:#14672d}.failed,.ambiguous{background:#ffe5e2;color:#a1221b}
  .skipped,.pending,.undefined,.unknown{background:#fff1cc;color:#795000}
  .paso{padding:13px 0;border-bottom:1px solid #e5eaf1}.paso:last-child{border:0}.paso summary{cursor:pointer}.detalle{padding:8px 0 0 20px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f5f8;padding:12px;border-radius:5px;font-size:.85rem}
  img,video{display:block;max-width:100%;height:auto;border:1px solid #d9e1ec;border-radius:6px;margin:10px 0}
  .muted{font-size:.9rem;color:#526278}.enlaces{display:flex;gap:18px;flex-wrap:wrap}
`;
const pagina = (titulo, cuerpo) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(titulo)}</title><style>${estilos}</style></head><body>${cuerpo}</body></html>`;
const etiqueta = estado => `<span class="estado ${escapar(estado)}">${escapar(textoEstado[estado] ?? textoEstado.unknown)}</span>`;

function adjuntos(paso) {
  return (paso.embeddings ?? []).map(adjunto => {
    const tipo = adjunto.mime_type ?? adjunto.media?.type ?? '';
    const datos = adjunto.data ?? '';
    if (!/^[A-Za-z0-9+/=\r\n]*$/.test(datos)) return '<p class="muted">Adjunto no disponible.</p>';
    if (tipo === 'image/png' || tipo === 'image/jpeg') return `<p class="muted">Captura del navegador</p><img src="data:${tipo};base64,${datos}" alt="Captura del escenario">`;
    if (tipo === 'application/json' || tipo.startsWith('text/')) {
      let contenido = Buffer.from(datos, 'base64').toString('utf8');
      if (tipo === 'application/json') {
        try {
          const objeto = JSON.parse(contenido);
          if (objeto.tipoEvidencia === 'video' && typeof objeto.archivo === 'string' && /^[a-zA-Z0-9_@-]+\.webm$/.test(objeto.archivo)) {
            const enlace = `../videos/${encodeURIComponent(objeto.archivo)}`;
            return `<p class="muted">Grabación del escenario</p><video controls preload="metadata" src="${enlace}">Tu navegador no admite este vídeo.</video><a href="${enlace}">Descargar vídeo</a>`;
          }
          if (objeto.tipoEvidencia === 'selectores' && Array.isArray(objeto.selectores)) {
            return `<p class="muted">Selectores usados en este paso, en orden</p><ol>${objeto.selectores.map(selector => `<li><code>${escapar(selector)}</code></li>`).join('')}</ol>`;
          }
          if (objeto.tipoEvidencia === 'peticiones' && Array.isArray(objeto.peticiones)) {
            return `<p class="muted">Peticiones de API realizadas en este paso</p><ol>${objeto.peticiones.map(peticion => `<li><code>${escapar(peticion.metodo)} ${escapar(peticion.ruta)}</code> · HTTP ${escapar(peticion.estado)}</li>`).join('')}</ol>`;
          }
          contenido = JSON.stringify(objeto, null, 2);
        } catch {}
      }
      return `<p class="muted">Datos adjuntos</p><pre>${escapar(contenido)}</pre>`;
    }
    return `<p class="muted">Adjunto disponible en el informe completo (${escapar(tipo)}).</p>`;
  }).join('');
}

function htmlCaso(caso, fecha, identificador) {
  const pasos = caso.pasos.map(paso => {
    const estado = paso.result?.status ?? 'unknown';
    const titulo = paso.hidden ? (paso.keyword === 'Before' ? 'Preparación' : 'Limpieza y evidencias') : `${paso.keyword ?? ''}${paso.name ?? ''}`;
    const tiempo = paso.result?.duration ? ` · ${(paso.result.duration / 1e9).toFixed(3)} s` : '';
    const fallo = paso.result?.error_message ? `<pre>${escapar(paso.result.error_message)}</pre>` : '';
    const abierto = ['failed', 'ambiguous'].includes(estado) ? ' open' : '';
    return `<details class="paso"${abierto}><summary>${etiqueta(estado)} <strong>${escapar(titulo)}</strong><span class="muted">${tiempo}</span></summary><div class="detalle">${fallo}${adjuntos(paso) || '<p class="muted">Este paso no tiene adjuntos.</p>'}</div></details>`;
  }).join('');
  const cuerpo = `<p><a href="../index.html">← Volver a la ejecución</a></p><h1>${escapar(caso.nombre)}</h1><p class="sub">${escapar(caso.caracteristica)} · ${escapar(identificador)} · ${escapar(fecha.toLocaleString('es-ES'))}</p><div class="panel"><p>${etiqueta(caso.estado)} <span class="muted">Duración acumulada de pasos: ${caso.duracion.toFixed(3)} s</span></p><p class="muted">Origen: ${escapar(caso.origen)}:${escapar(caso.linea)}</p></div><h2>Pasos y evidencias</h2><div class="panel">${pasos}</div>`;
  return pagina(caso.nombre, cuerpo);
}

export function generarInformes(carpeta, fecha) {
  const datos = JSON.parse(readFileSync(join(carpeta, 'cucumber.json'), 'utf8'));
  const casos = datos.flatMap(caracteristica => (caracteristica.elements ?? []).filter(elemento => elemento.type === 'scenario').map(elemento => ({
    nombre: elemento.name, caracteristica: caracteristica.name, origen: caracteristica.uri, linea: elemento.line,
    pasos: elemento.steps ?? [], estado: estadoCaso(elemento.steps ?? []),
    duracion: (elemento.steps ?? []).reduce((suma, paso) => suma + (paso.result?.duration ?? 0), 0) / 1e9
  })));
  casos.sort((a, b) => a.origen.localeCompare(b.origen) || a.linea - b.linea || a.nombre.localeCompare(b.nombre));
  mkdirSync(join(carpeta, 'casos'), { recursive: true });
  const identificador = carpeta.split(/[\\/]/).at(-1);
  for (const [indice, caso] of casos.entries()) {
    caso.archivo = `${String(indice + 1).padStart(2, '0')}-${nombreSeguro(caso.nombre)}.html`;
    writeFileSync(join(carpeta, 'casos', caso.archivo), htmlCaso(caso, fecha, identificador), 'utf8');
  }
  const correctos = casos.filter(caso => caso.estado === 'passed').length;
  const fallidos = casos.filter(caso => caso.estado === 'failed').length;
  const otros = casos.length - correctos - fallidos;
  const filas = casos.map(caso => `<tr><td>${etiqueta(caso.estado)}</td><td><a href="casos/${encodeURIComponent(caso.archivo)}">${escapar(caso.nombre)}</a></td><td>${escapar(caso.caracteristica)}</td><td>${caso.duracion.toFixed(2)} s</td></tr>`).join('');
  const cuerpo = `<h1>Evidencias de pruebas</h1><p class="sub">Ejecución ${escapar(identificador)} · ${escapar(fecha.toLocaleString('es-ES'))} · hora local del equipo</p><div class="resumen"><div class="dato"><strong>${casos.length}</strong> casos</div><div class="dato"><strong>${correctos}</strong> correctos</div><div class="dato"><strong>${fallidos}</strong> fallidos</div><div class="dato"><strong>${otros}</strong> pendientes o no ejecutados</div></div><div class="panel enlaces"><a href="cucumber.html">Informe completo de Cucumber</a><a href="cucumber.json">Resultados JSON</a><a href="junit.xml">Resultados JUnit</a></div><h2>Informe de cada caso</h2><div class="panel"><table><thead><tr><th>Resultado</th><th>Caso</th><th>Característica</th><th>Duración</th></tr></thead><tbody>${filas || '<tr><td colspan="4">No se ejecutó ningún caso.</td></tr>'}</tbody></table></div>`;
  writeFileSync(join(carpeta, 'index.html'), pagina('Evidencias de pruebas', cuerpo), 'utf8');
  writeFileSync(join(carpeta, 'resumen.json'), JSON.stringify({ fechaInicio: fecha.toISOString(), identificador, total: casos.length, correctos, fallidos, otros, casos: casos.map(({ nombre, caracteristica, origen, linea, estado, duracion, archivo }) => ({ nombre, caracteristica, origen, linea, estado, duracionSegundos: duracion, archivo })) }, null, 2) + '\n', 'utf8');
  return { total: casos.length, correctos, fallidos, otros };
}
