import { World, setWorldConstructor, type IWorldOptions } from '@cucumber/cucumber';
import type { APIResponse, BrowserContext, Locator, Page } from '@playwright/test';
import { ClienteApi } from '../cliente-api';
import { crearLibro, crearUsuario } from '../datos';
import { PaginaAcceso } from '../paginas/acceso';
import { PaginaCatalogo } from '../paginas/catalogo';

export class Mundo extends World {
  api!: ClienteApi;
  respuesta!: APIResponse;
  usuario = crearUsuario();
  usuarioRegistrado = false;
  libro = crearLibro();
  identificador = '';
  tokenAnterior = '';
  contexto?: BrowserContext;
  pagina?: Page;
  acceso!: PaginaAcceso;
  catalogo!: PaginaCatalogo;
  artefacto = '';
  numeroPaso = 0;
  selectoresPaso: string[] = [];

  constructor(opciones: IWorldOptions) { super(opciones); }

  registrarSelector(localizador: Locator): Locator {
    this.selectoresPaso.push(localizador.toString());
    return localizador;
  }

  async prepararUsuario(): Promise<void> {
    if (!this.usuarioRegistrado) {
      await this.api.registrar(this.usuario);
      this.usuarioRegistrado = true;
    }
  }

  async autenticar(): Promise<void> {
    await this.prepararUsuario();
    await this.api.entrar(this.usuario);
  }

  async prepararLibro(): Promise<void> {
    this.respuesta = await this.api.crear(this.libro);
    this.identificador = (await this.respuesta.json()).id;
  }
}

setWorldConstructor(Mundo);
