import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect } from '@playwright/test';
import type { LibroEntrada, UsuarioPrueba } from './datos';

export class ClienteApi {
  token?: string;
  readonly librosCreados = new Set<string>();
  readonly peticionesPaso: Array<{ metodo: string; ruta: string; estado: number }> = [];

  constructor(readonly contexto: APIRequestContext) {}

  async solicitar(metodo: string, ruta: string, datos?: unknown, token = this.token): Promise<APIResponse> {
    const respuesta = await this.contexto.fetch(ruta, {
      method: metodo,
      data: datos,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      failOnStatusCode: false
    });
    this.peticionesPaso.push({ metodo, ruta, estado: respuesta.status() });
    return respuesta;
  }

  async registrar(usuario: UsuarioPrueba): Promise<APIResponse> {
    const respuesta = await this.solicitar('POST', '/api/users', usuario);
    expect(respuesta.status(), 'Registro del usuario del escenario').toBe(201);
    return respuesta;
  }

  async entrar(usuario: UsuarioPrueba): Promise<void> {
    const respuesta = await this.solicitar('POST', '/api/auth/login', usuario);
    expect(respuesta.status(), 'Inicio de sesión del escenario').toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.token).toEqual(expect.any(String));
    this.token = cuerpo.token;
  }

  async crear(libro: LibroEntrada): Promise<APIResponse> {
    const respuesta = await this.solicitar('POST', '/api/books', libro);
    expect(respuesta.status(), 'Alta del libro de prueba').toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.id, 'Identificador que devuelve la versión 1.0.0').toMatch(/^[a-f\d]{24}$/i);
    this.librosCreados.add(cuerpo.id);
    return respuesta;
  }

  async limpiar(usuario: UsuarioPrueba): Promise<void> {
    // El login de la interfaz puede haber invalidado el token anterior.
    await this.entrar(usuario);
    const fallos: string[] = [];
    for (const identificador of this.librosCreados) {
      const respuesta = await this.solicitar('DELETE', `/api/books/${identificador}`);
      if (![204, 404].includes(respuesta.status())) fallos.push(`${identificador}: HTTP ${respuesta.status()}`);
    }
    const salida = await this.solicitar('POST', '/api/auth/logout');
    if (salida.status() !== 204) fallos.push(`logout: HTTP ${salida.status()}`);
    expect(fallos, 'Limpieza de los datos propios').toEqual([]);
  }
}
