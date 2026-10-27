import { expect, type Page, type Locator } from '@playwright/test';
import type { LibroEntrada } from '../datos';

export class PaginaCatalogo {
  constructor(private readonly pagina: Page, private readonly registrar: (localizador: Locator) => Locator) {}

  private localizar(identificador: string): Locator { return this.registrar(this.pagina.getByTestId(identificador)); }

  fila(isbn: string): Locator {
    return this.registrar(this.pagina.getByTestId('book-row').filter({ has: this.pagina.getByTestId('book-row-isbn').filter({ hasText: isbn }) }));
  }

  async buscar(texto: string): Promise<void> { await this.localizar('books-search-input').fill(texto); }

  async rellenar(libro: LibroEntrada): Promise<void> {
    await this.localizar('book-title-input').fill(libro.title);
    await this.localizar('book-author-input').fill(libro.author);
    await this.localizar('book-isbn-input').fill(libro.isbn);
    await this.localizar('book-year-input').fill(String(libro.publishedYear));
    await this.localizar('book-price-input').fill(String(libro.price));
  }

  async crear(libro: LibroEntrada, registrarId: (identificador: string) => void): Promise<void> {
    await this.localizar('add-book-btn').click();
    await this.rellenar(libro);
    const pendiente = this.pagina.waitForResponse(respuesta => respuesta.url().endsWith('/api/books') && respuesta.request().method() === 'POST');
    await this.localizar('book-save-btn').click();
    const respuesta = await pendiente;
    expect(respuesta.status()).toBe(201);
    registrarId((await respuesta.json()).id);
    await expect(this.localizar('book-modal')).toBeHidden();
    await expect(this.fila(libro.isbn)).toBeVisible();
  }

  async editar(libro: LibroEntrada): Promise<void> {
    await this.registrar(this.fila(libro.isbn).getByTestId('edit-book-btn')).click();
    await this.rellenar(libro);
    await this.localizar('book-save-btn').click();
    await expect(this.localizar('book-modal')).toBeHidden();
    await expect(this.registrar(this.fila(libro.isbn).getByTestId('book-row-title'))).toHaveText(libro.title);
  }
}
