import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { Mundo } from '../soporte/mundo';
import { validarEsquema } from '../esquemas';

Given('a new user registered through the API', async function (this: Mundo) { await this.prepararUsuario(); });
Given('a user authenticated through the API', async function (this: Mundo) { await this.autenticar(); });
Given('my own book created through the API', async function (this: Mundo) { await this.prepararLibro(); });

When('I check the service health', async function (this: Mundo) { this.respuesta = await this.api.solicitar('GET', '/api/health'); });
Then('the service reports that the database is available', async function (this: Mundo) {
  expect(this.respuesta.status()).toBe(200);
  expect(await this.respuesta.json()).toEqual({ status: 'ok', db: 'up' });
});

When('I log in through the API', async function (this: Mundo) {
  this.respuesta = await this.api.solicitar('POST', '/api/auth/login', this.usuario);
  expect(this.respuesta.status()).toBe(200);
  this.api.token = (await this.respuesta.json()).token;
});
Then('the session and profile match their schemas without exposing the password', async function (this: Mundo) {
  validarEsquema('sesion', await this.respuesta.json());
  const perfil = await this.api.solicitar('GET', '/api/auth/me');
  expect(perfil.status()).toBe(200);
  const cuerpo = await perfil.json();
  validarEsquema('usuario', cuerpo);
  expect(cuerpo).toMatchObject({ name: this.usuario.name, email: this.usuario.email, role: 'user' });
});

When('I register the same user again', async function (this: Mundo) {
  this.respuesta = await this.api.solicitar('POST', '/api/users', this.usuario);
});
When('I register a user with invalid {string}', async function (this: Mundo, campo: string) {
  const invalidos: Record<string, string> = { name: '', email: 'correo-sin-arroba', password: '123' };
  expect(Object.hasOwn(invalidos, campo)).toBe(true);
  this.respuesta = await this.api.solicitar('POST', '/api/users', { ...this.usuario, [campo]: invalidos[campo] });
});
When('I log in through the API with the wrong password', async function (this: Mundo) {
  this.respuesta = await this.api.solicitar('POST', '/api/auth/login', { ...this.usuario, password: 'Incorrecta123' });
});
When('I submit a login without a password', async function (this: Mundo) {
  this.respuesta = await this.api.solicitar('POST', '/api/auth/login', { email: this.usuario.email });
});
When('I request the books without a token', async function (this: Mundo) { this.respuesta = await this.api.solicitar('GET', '/api/books'); });
When('I request the books with an invalid token', async function (this: Mundo) {
  this.respuesta = await this.api.solicitar('GET', '/api/books', undefined, 'token.manipulado.invalido');
});
Then('I receive status {int} with code {string}', async function (this: Mundo, estado: number, codigo: string) {
  expect(this.respuesta.status()).toBe(estado);
  expect(this.respuesta.headers()['content-type']).toContain('application/json');
  const cuerpo = await this.respuesta.json();
  validarEsquema('error', cuerpo);
  expect(cuerpo.code).toBe(codigo);
});
Then('the error identifies field {string}', async function (this: Mundo, campo: string) {
  expect((await this.respuesta.json()).errors[campo]).toEqual(expect.any(String));
});

When('I log out and reuse the token', async function (this: Mundo) {
  const salida = await this.api.solicitar('POST', '/api/auth/logout');
  expect(salida.status()).toBe(204);
  expect(await salida.body()).toHaveLength(0);
  this.respuesta = await this.api.solicitar('GET', '/api/auth/me');
});
When('I start a second session and use the first token', async function (this: Mundo) {
  this.tokenAnterior = this.api.token!;
  await this.api.entrar(this.usuario);
  this.respuesta = await this.api.solicitar('GET', '/api/auth/me', undefined, this.tokenAnterior);
});
Then('the second session still works', async function (this: Mundo) {
  const perfil = await this.api.solicitar('GET', '/api/auth/me');
  expect(perfil.status()).toBe(200);
  expect((await perfil.json()).email).toBe(this.usuario.email);
});

When('I create my own book through the API', async function (this: Mundo) { await this.prepararLibro(); });
Then('I can find it by ID and in the book list', async function (this: Mundo) {
  expect(this.respuesta.headers().location).toBe(`/api/books/${this.identificador}`);
  const consulta = await this.api.solicitar('GET', `/api/books/${this.identificador}`);
  expect(consulta.status()).toBe(200);
  const cuerpo = await consulta.json();
  validarEsquema('libroObservado', cuerpo);
  expect(cuerpo).toMatchObject({ ...this.libro });
  const listado = await this.api.solicitar('GET', '/api/books');
  expect(listado.status()).toBe(200);
  const libros = await listado.json();
  expect(Array.isArray(libros)).toBe(true);
  expect(libros).toEqual(expect.arrayContaining([expect.objectContaining({ id: this.identificador, ...this.libro })]));
});
When('I update only its title and price', async function (this: Mundo) {
  this.libro = { ...this.libro, title: `${this.libro.title} revisado`, price: 27.35 };
  this.respuesta = await this.api.solicitar('PUT', `/api/books/${this.identificador}`, { title: this.libro.title, price: this.libro.price });
});
Then('the changes persist and the other fields stay the same', async function (this: Mundo) {
  expect(this.respuesta.status()).toBe(200);
  expect(await this.respuesta.json()).toMatchObject({ ...this.libro });
  const consulta = await this.api.solicitar('GET', `/api/books/${this.identificador}`);
  expect(consulta.status()).toBe(200);
  expect(await consulta.json()).toMatchObject({ id: this.identificador, ...this.libro });
});
When('I delete the book through the API', async function (this: Mundo) { this.respuesta = await this.api.solicitar('DELETE', `/api/books/${this.identificador}`); });
Then('deletion returns an empty 204 response and the book no longer exists', async function (this: Mundo) {
  expect(this.respuesta.status()).toBe(204);
  expect(await this.respuesta.body()).toHaveLength(0);
  const consulta = await this.api.solicitar('GET', `/api/books/${this.identificador}`);
  expect(consulta.status()).toBe(404);
  expect((await consulta.json()).code).toBe('BOOK_NOT_FOUND');
});
When('I create a book with invalid {string}', async function (this: Mundo, campo: string) {
  const invalidos: Record<string, unknown> = { isbn: 'no-es-un-isbn', publishedYear: 1449, price: -0.01 };
  expect(Object.hasOwn(invalidos, campo)).toBe(true);
  this.respuesta = await this.api.solicitar('POST', '/api/books', { ...this.libro, [campo]: invalidos[campo] });
  if (this.respuesta.status() === 201) this.api.librosCreados.add((await this.respuesta.json()).id);
});
When('I try to create another book with the same ISBN', async function (this: Mundo) {
  this.respuesta = await this.api.solicitar('POST', '/api/books', { ...this.libro, title: 'Otro título para el mismo ISBN' });
  if (this.respuesta.status() === 201) this.api.librosCreados.add((await this.respuesta.json()).id);
});
When('I request a {string} book identifier', async function (this: Mundo, tipo: string) {
  const identificador = tipo === 'malformed' ? 'no-valido' : randomBytes(12).toString('hex');
  this.respuesta = await this.api.solicitar('GET', `/api/books/${identificador}`);
});

Then('Swagger requires bookId and the response includes it', async function (this: Mundo) {
  const documento = await this.api.solicitar('GET', '/api/docs.json');
  expect(documento.status()).toBe(200);
  expect((await documento.json()).components.schemas.Book.required).toContain('bookId');
  const cuerpo = await this.respuesta.json();
  await this.attach(JSON.stringify({ esperado: 'bookId', camposRecibidos: Object.keys(cuerpo) }), 'application/json');
  validarEsquema('identificadorDocumentado', cuerpo);
});
Then('Swagger defines price as text and the response has two decimals', async function (this: Mundo) {
  const documento = await this.api.solicitar('GET', '/api/docs.json');
  expect(documento.status()).toBe(200);
  expect((await documento.json()).components.schemas.Book.properties.price.type).toBe('string');
  const cuerpo = await this.respuesta.json();
  await this.attach(JSON.stringify({ esperado: 'string', recibido: typeof cuerpo.price, valor: cuerpo.price }), 'application/json');
  validarEsquema('precioDocumentado', cuerpo);
});
