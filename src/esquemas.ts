import Ajv from 'ajv';
import agregarFormatos from 'ajv-formats';
import { expect } from '@playwright/test';

const validador = new Ajv({ allErrors: true });
agregarFormatos(validador);

const usuario = {
  type: 'object', required: ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }, name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }, role: { enum: ['admin', 'user'] },
    createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' }
  },
  not: { anyOf: [{ required: ['password'] }, { required: ['passwordHash'] }, { required: ['activeSessionId'] }] }
};

const esquemas = {
  usuario,
  sesion: {
    type: 'object', required: ['token', 'tokenType', 'expiresIn', 'user'],
    properties: { token: { type: 'string', minLength: 20 }, tokenType: { const: 'Bearer' }, expiresIn: { type: 'string' }, user: usuario }
  },
  error: {
    type: 'object', required: ['code', 'message'],
    properties: { code: { type: 'string', minLength: 1 }, message: { type: 'string', minLength: 1 }, errors: { type: 'object', additionalProperties: { type: 'string' } } },
    additionalProperties: false
  },
  libroObservado: {
    type: 'object', required: ['id', 'title', 'author', 'isbn', 'publishedYear', 'price', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }, title: { type: 'string' }, author: { type: 'string' },
      isbn: { type: 'string' }, publishedYear: { type: 'integer', minimum: 1450 }, price: { type: 'number', minimum: 0 },
      createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' }
    }
  },
  // Estas dos comprobaciones mantienen lo que promete Swagger.
  identificadorDocumentado: { type: 'object', required: ['bookId'], properties: { bookId: { type: 'string' } } },
  precioDocumentado: { type: 'object', required: ['price'], properties: { price: { type: 'string', pattern: '^\\d+\\.\\d{2}$' } } }
};

const comprobaciones = Object.fromEntries(Object.entries(esquemas).map(([nombre, esquema]) => [nombre, validador.compile(esquema)]));

export function validarEsquema(nombre: keyof typeof esquemas, datos: unknown): void {
  const comprobar = comprobaciones[nombre]!;
  const valido = comprobar(datos);
  expect(valido, `${nombre}: ${validador.errorsText(comprobar.errors)}`).toBe(true);
}
