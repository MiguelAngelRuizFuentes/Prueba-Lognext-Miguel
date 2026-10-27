# Incidencias observadas

Fecha de comprobación: 26 de octubre de 2026. Aplicación entregada: BookStore QA Sandbox 1.0.0. Ambas incidencias se confirmaron ejecutando las imágenes originales en Docker Compose: backend con Node.js 22.23.4, MongoDB 7.0.45 y frontend con Nginx 1.27.5. La ejecución anterior en procesos locales también había reproducido estos dos fallos.

## INC 01 El identificador del libro no coincide con Swagger

- **Prioridad propuesta:** media. Puede romper clientes generados a partir de la especificación.
- **Caso automatizado:** A20, etiqueta `@book_contract`.
- **Precondición:** un usuario registrado y autenticado con su propio token.
- **Pasos:** crear un libro válido mediante `POST /api/books`; consultar `GET /api/docs.json`; comparar la respuesta con `components.schemas.Book`.
- **Esperado:** `bookId` es un campo obligatorio de tipo texto, según Swagger.
- **Recibido:** el servidor devuelve `id` y no incluye `bookId`.
- **Evidencia:** AJV falla con `data must have required property 'bookId'`. Campos recibidos: `title`, `author`, `isbn`, `publishedYear`, `price`, `createdBy`, `createdAt`, `updatedAt`, `id`.
- **Propuesta:** acordar si el contrato válido utiliza `id` o `bookId` y alinear documentación, API y consumidores. No cambiar unilateralmente el test para aceptar ambos.

## INC 02 El precio tiene un tipo diferente del publicado

- **Prioridad propuesta:** media. Afecta a la deserialización y al formato esperado por consumidores.
- **Caso automatizado:** A21, etiqueta `@book_contract`.
- **Pasos:** crear un libro con `price: 19.95`; consultar Swagger y comparar el precio de respuesta.
- **Esperado:** `price` de tipo `string` con dos decimales, por ejemplo `"19.95"`.
- **Recibido:** `price` numérico, por ejemplo `19.95`.
- **Evidencia:** AJV falla con `data/price must be string`. El informe adjunta tipo esperado, tipo recibido y valor.
- **Propuesta:** decidir la representación del precio y mantenerla coherente en el contrato y en las respuestas. El precio numérico funciona en el CRUD actual, pero no cumple lo que Swagger promete.

## Observación de documentación sobre sesiones

Un segundo login del mismo usuario invalida el token anterior. Logout también devuelve `SESSION_INVALIDATED` al reutilizar el token. Ese código no figura en la enumeración `Error.code` de Swagger inspeccionada. A11 y A12 verifican el comportamiento observado; sería conveniente documentar la sesión única y añadir ese código al contrato. Esta observación no añade un tercer fallo artificial a la suite.

## Reproducción

Con el entorno activo:

```powershell
npm run test:contrato
```

Los dos casos deben terminar fallando mientras persista la discrepancia. La ejecución completa no oculta esos fallos. Las prioridades son propuestas de QA, pendientes de validación con el equipo responsable.
