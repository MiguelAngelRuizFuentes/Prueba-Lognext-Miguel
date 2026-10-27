import { Before, After, AfterStep, AfterAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, request, type Browser } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, join } from 'node:path';
import { configuracion } from './configuracion';
import { Mundo } from './mundo';
import { ClienteApi } from '../cliente-api';
import { PaginaAcceso } from '../paginas/acceso';
import { PaginaCatalogo } from '../paginas/catalogo';

let navegador: Browser | undefined;
setDefaultTimeout(configuracion.espera * 3);

Before(async function (this: Mundo) {
  this.api = new ClienteApi(await request.newContext({ baseURL: configuracion.api, timeout: configuracion.espera }));
});

Before({ tags: '@ui' }, async function (this: Mundo, escenario) {
  navegador ??= await chromium.launch({ headless: configuracion.sinVentana, channel: configuracion.canal });
  const grabar = process.env.VIDEO !== 'false' || escenario.pickle.tags.some(etiqueta => etiqueta.name === '@video');
  const carpetaVideos = join(configuracion.carpetaEvidencia, 'videos');
  if (grabar) await mkdir(carpetaVideos, { recursive: true });
  this.contexto = await navegador.newContext({
    baseURL: configuracion.web,
    viewport: { width: 1440, height: 900 },
    recordVideo: grabar ? { dir: carpetaVideos, size: { width: 960, height: 600 } } : undefined
  });
  this.contexto.setDefaultTimeout(configuracion.espera);
  this.pagina = await this.contexto.newPage();
  this.acceso = new PaginaAcceso(this.pagina, localizador => this.registrarSelector(localizador));
  this.catalogo = new PaginaCatalogo(this.pagina, localizador => this.registrarSelector(localizador));
  this.artefacto = randomUUID();
  if (configuracion.trazas) await this.contexto.tracing.start({ screenshots: true, snapshots: true, sources: false });
});

AfterStep(async function (this: Mundo) {
  this.numeroPaso += 1;
  if (this.api?.peticionesPaso.length) {
    await this.attach(JSON.stringify({ tipoEvidencia: 'peticiones', peticiones: this.api.peticionesPaso.splice(0) }), 'application/json');
  }
  if (this.selectoresPaso.length) {
    await this.attach(JSON.stringify({ tipoEvidencia: 'selectores', selectores: this.selectoresPaso }), 'application/json');
    this.selectoresPaso = [];
  }
  // Los pasos que preparan datos por API aún no tienen pantalla que fotografiar.
  if (!this.pagina || this.pagina.isClosed() || this.pagina.url() === 'about:blank') return;
  const carpeta = join(configuracion.carpetaEvidencia, 'capturas');
  await mkdir(carpeta, { recursive: true });
  const nombre = `${this.artefacto}-paso-${String(this.numeroPaso).padStart(2, '0')}.png`;
  const captura = await this.pagina.screenshot({ path: join(carpeta, nombre), fullPage: true });
  await this.attach(captura, 'image/png');
});

// El cierre puede tardar más cuando varios vídeos se guardan a la vez.
After({ timeout: 120_000 }, async function (this: Mundo, escenario) {
  const errores: unknown[] = [];
  const intentar = async (operacion: () => Promise<unknown>): Promise<void> => {
    try { await operacion(); } catch (error) { errores.push(error); }
  };
  if (this.pagina) {
    await intentar(async () => {
      const carpeta = join(configuracion.carpetaEvidencia, 'capturas');
      await mkdir(carpeta, { recursive: true });
      const captura = await this.pagina!.screenshot({ path: join(carpeta, `${this.artefacto}-final.png`), fullPage: true });
      await this.attach(captura, 'image/png');
    });
  }
  if (this.contexto && configuracion.trazas) {
    await intentar(async () => {
      const carpeta = join(configuracion.carpetaEvidencia, 'trazas');
      await mkdir(carpeta, { recursive: true });
      await this.contexto!.tracing.stop(escenario.result?.status === Status.FAILED ? { path: join(carpeta, `${this.artefacto}.zip`) } : {});
    });
  }
  const video = this.pagina?.video();
  if (this.contexto) await intentar(() => this.contexto!.close());
  if (video) await intentar(async () => {
    const archivo = basename(await video.path());
    await this.attach(JSON.stringify({ tipoEvidencia: 'video', archivo }), 'application/json');
  });
  if (this.usuarioRegistrado) await intentar(() => this.api.limpiar(this.usuario));
  if (this.api) await intentar(() => this.api.contexto.dispose());
  // Un fallo de limpieza también debe verse en el informe.
  if (errores.length) throw new AggregateError(errores, 'No se pudo completar la limpieza del escenario');
});

AfterAll(async () => { await navegador?.close(); });
