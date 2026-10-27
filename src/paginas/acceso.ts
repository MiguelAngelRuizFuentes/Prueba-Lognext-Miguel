import { expect, type Locator, type Page } from '@playwright/test';
import type { UsuarioPrueba } from '../datos';

export class PaginaAcceso {
  constructor(private readonly pagina: Page, private readonly anotar: (localizador: Locator) => Locator) {}

  private localizar(identificador: string): Locator { return this.anotar(this.pagina.getByTestId(identificador)); }

  async abrir(): Promise<void> { await this.pagina.goto('/login'); }

  async rellenar(usuario: UsuarioPrueba): Promise<void> {
    await this.localizar('login-email-input').fill(usuario.email);
    // Playwright entra en el Shadow DOM abierto del campo de contraseña.
    await this.localizar('login-password-input').fill(usuario.password);
  }

  async enviar(): Promise<void> {
    await this.anotar(this.pagina.frameLocator('[data-testid="login-submit-frame"]').getByTestId('login-submit-btn')).click();
  }

  async entrar(usuario: UsuarioPrueba): Promise<string> {
    await this.abrir();
    await this.rellenar(usuario);
    const pendiente = this.pagina.waitForResponse(respuesta => respuesta.url().endsWith('/api/auth/login') && respuesta.request().method() === 'POST');
    await this.enviar();
    const respuesta = await pendiente;
    expect(respuesta.status()).toBe(200);
    await expect(this.localizar('books-page')).toBeVisible();
    return (await respuesta.json()).token;
  }

  async registrar(usuario: UsuarioPrueba): Promise<void> {
    await this.pagina.goto('/register');
    await this.localizar('register-name-input').fill(usuario.name);
    await this.localizar('register-email-input').fill(usuario.email);
    await this.localizar('register-password-input').fill(usuario.password);
    await this.localizar('register-confirm-password-input').fill(usuario.password);
    await this.localizar('register-submit-btn').click();
    await expect(this.localizar('registration-success-message')).toBeVisible();
  }
}
