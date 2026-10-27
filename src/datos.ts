import { randomInt, randomUUID } from 'node:crypto';

export interface UsuarioPrueba { name: string; email: string; password: string }
export interface LibroEntrada { title: string; author: string; isbn: string; publishedYear: number; price: number }

export function crearUsuario(): UsuarioPrueba {
  const identificador = randomUUID();
  return { name: 'Miguel QA', email: `qa.${identificador}@example.com`, password: `Prueba-${identificador}` };
}

export function crearLibro(): LibroEntrada {
  const base = `978${randomInt(0, 1_000_000_000).toString().padStart(9, '0')}`;
  const suma = [...base].reduce((total, cifra, indice) => total + Number(cifra) * (indice % 2 === 0 ? 1 : 3), 0);
  // El último dígito hace que el ISBN sea válido de verdad.
  const isbn = `${base}${(10 - suma % 10) % 10}`;
  return { title: `Lectura QA ${randomUUID()}`, author: 'Miguel QA', isbn, publishedYear: 2020, price: 19.95 };
}
