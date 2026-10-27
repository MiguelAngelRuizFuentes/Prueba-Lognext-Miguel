import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { Mundo } from '../soporte/mundo';

async function entrar(this: Mundo): Promise<void> { this.api.token = await this.acceso.entrar(this.usuario); }
When('I log in through the web interface', entrar);
Given('a session started through the web interface', entrar);

Then('I see my name and email in the catalog', async function (this: Mundo) {
  await expect(this.registrarSelector(this.pagina!.getByTestId('user-name'))).toHaveText(this.usuario.name);
  await expect(this.registrarSelector(this.pagina!.getByTestId('user-email'))).toContainText(this.usuario.email);
});
When('I try to log in through the web interface with the wrong password', async function (this: Mundo) {
  await this.acceso.abrir();
  await this.acceso.rellenar({ ...this.usuario, password: 'Incorrecta123' });
  await this.acceso.enviar();
});
Then('I see the credentials error and remain on the login page', async function (this: Mundo) {
  await expect(this.registrarSelector(this.pagina!.getByRole('alert'))).toContainText('Invalid email or password');
  await expect(this.pagina!).toHaveURL(/\/login$/);
});
When('I register my user through the web interface', async function (this: Mundo) {
  await this.acceso.registrar(this.usuario);
  this.usuarioRegistrado = true;
});
When('I open the catalog without logging in', async function (this: Mundo) { await this.pagina!.goto('/books'); });
When('I reopen the catalog', async function (this: Mundo) { await this.pagina!.goto('/books'); });
Then('I am on the login page', async function (this: Mundo) {
  await expect(this.pagina!).toHaveURL(/\/login$/);
  await expect(this.registrarSelector(this.pagina!.getByTestId('login-page'))).toBeVisible();
});
When('I search for my book by ISBN', async function (this: Mundo) { await this.catalogo.buscar(this.libro.isbn); });
Then('only my book appears with its saved details', async function (this: Mundo) {
  await expect(this.registrarSelector(this.pagina!.getByTestId('book-row'))).toHaveCount(1);
  const fila = this.catalogo.fila(this.libro.isbn);
  await expect(this.registrarSelector(fila.getByTestId('book-row-title'))).toHaveText(this.libro.title);
  await expect(this.registrarSelector(fila.getByTestId('book-row-author'))).toHaveText(this.libro.author);
  await expect(this.registrarSelector(fila.getByTestId('book-row-year'))).toHaveText(String(this.libro.publishedYear));
  await expect(this.registrarSelector(fila.getByTestId('book-row-price'))).toContainText(this.libro.price.toFixed(2));
});
When('I create my book through the web interface', async function (this: Mundo) {
  await this.catalogo.crear(this.libro, identificador => {
    this.identificador = identificador;
    this.api.librosCreados.add(identificador);
  });
});
Then('the API returns the same book details', async function (this: Mundo) {
  const respuesta = await this.api.solicitar('GET', `/api/books/${this.identificador}`);
  expect(respuesta.status()).toBe(200);
  expect(await respuesta.json()).toMatchObject({ id: this.identificador, ...this.libro });
});
When('I change the title and price through the web interface', async function (this: Mundo) {
  this.libro = { ...this.libro, title: `${this.libro.title} editado`, price: 24.8 };
  await this.catalogo.editar(this.libro);
});
When('I cancel deletion through the web interface', async function (this: Mundo) {
  await this.registrarSelector(this.catalogo.fila(this.libro.isbn).getByTestId('delete-book-btn')).click();
  await this.registrarSelector(this.pagina!.getByTestId('delete-cancel-btn')).click();
  await expect(this.registrarSelector(this.pagina!.getByTestId('delete-modal'))).toBeHidden();
  await expect(this.catalogo.fila(this.libro.isbn)).toBeVisible();
});
When('I confirm deletion through the web interface', async function (this: Mundo) {
  await this.registrarSelector(this.catalogo.fila(this.libro.isbn).getByTestId('delete-book-btn')).click();
  // El botón se habilita al terminar la espera de confirmación de la aplicación.
  await this.registrarSelector(this.pagina!.getByTestId('delete-confirm-btn')).click();
  await expect(this.registrarSelector(this.pagina!.getByTestId('delete-modal'))).toBeHidden();
});
Then('the book disappears from the website and the API', async function (this: Mundo) {
  await expect(this.catalogo.fila(this.libro.isbn)).toHaveCount(0);
  const respuesta = await this.api.solicitar('GET', `/api/books/${this.identificador}`);
  expect(respuesta.status()).toBe(404);
  expect((await respuesta.json()).code).toBe('BOOK_NOT_FOUND');
});
When('I log out through the web interface', async function (this: Mundo) {
  this.tokenAnterior = this.api.token!;
  const pendiente = this.pagina!.waitForResponse(respuesta => respuesta.url().endsWith('/api/auth/logout') && respuesta.request().method() === 'POST');
  await this.registrarSelector(this.pagina!.getByTestId('logout-btn')).click();
  expect((await pendiente).status()).toBe(204);
  await expect(this.pagina!).toHaveURL(/\/login$/);
});
Then('the web session token no longer accesses the API', async function (this: Mundo) {
  const respuesta = await this.api.solicitar('GET', '/api/auth/me', undefined, this.tokenAnterior);
  expect(respuesta.status()).toBe(401);
  expect((await respuesta.json()).code).toBe('SESSION_INVALIDATED');
});

When('I try to register with two different passwords', async function (this: Mundo) {
  await this.pagina!.goto('/register');
  await this.registrarSelector(this.pagina!.getByTestId('register-name-input')).fill(this.usuario.name);
  await this.registrarSelector(this.pagina!.getByTestId('register-email-input')).fill(this.usuario.email);
  await this.registrarSelector(this.pagina!.getByTestId('register-password-input')).fill(this.usuario.password);
  await this.registrarSelector(this.pagina!.getByTestId('register-confirm-password-input')).fill('OtraClave123');
  await this.registrarSelector(this.pagina!.getByTestId('register-submit-btn')).click();
});
Then('I see the confirmation error and remain on the registration page', async function (this: Mundo) {
  await expect(this.registrarSelector(this.pagina!.getByTestId('register-confirm-password-error'))).toHaveText('Passwords do not match.');
  await expect(this.pagina!).toHaveURL(/\/register$/);
  await expect(this.registrarSelector(this.pagina!.getByTestId('registration-success-message'))).toHaveCount(0);
});

When('I search for an ISBN that does not exist', async function (this: Mundo) {
  await this.catalogo.buscar(this.libro.isbn);
});
Then('the catalog shows no matching books', async function (this: Mundo) {
  await expect(this.registrarSelector(this.pagina!.getByTestId('books-empty-state'))).toHaveText('No books match your search.');
  await expect(this.registrarSelector(this.pagina!.getByTestId('book-row'))).toHaveCount(0);
});

When('I change the title and cancel the edit', async function (this: Mundo) {
  await this.registrarSelector(this.catalogo.fila(this.libro.isbn).getByTestId('edit-book-btn')).click();
  await this.registrarSelector(this.pagina!.getByTestId('book-title-input')).fill(`${this.libro.title} sin guardar`);
  await this.registrarSelector(this.pagina!.getByTestId('book-cancel-btn')).click();
});
Then('the book keeps its original details on the website and in the API', async function (this: Mundo) {
  await expect(this.registrarSelector(this.pagina!.getByTestId('book-modal'))).toBeHidden();
  await expect(this.registrarSelector(this.catalogo.fila(this.libro.isbn).getByTestId('book-row-title'))).toHaveText(this.libro.title);
  const respuesta = await this.api.solicitar('GET', `/api/books/${this.identificador}`);
  expect(respuesta.status()).toBe(200);
  expect(await respuesta.json()).toMatchObject({ id: this.identificador, ...this.libro });
});
