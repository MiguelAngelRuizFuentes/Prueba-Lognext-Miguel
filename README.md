# Pruebas automatizadas de BookStore

He desarrollado 33 pruebas, 21 de API y 12 de front. He usado Playwright, TypeScript y Cucumber. Los casos están escritos en Gherkin en inglés.

En la última ejecución pasaron 31 pruebas y fallaron 2. He encontrado estas diferencias entre Swagger y la API:

- A20 -> Swagger pide bookId, pero la API devuelve id.
- A21 -> Swagger dice que price es un texto, pero la API devuelve un número.

En la carpeta evidencia se puede ver el histórico. En cada ejecución se puede abrir index.html para ver qué pruebas pasaron y cuáles fallaron. Las pruebas de front también tienen capturas y vídeos.

## Carpetas

- .git -> guarda la información y el historial de Git.
- .github -> tiene los archivos de GitHub Actions.
- dist -> guarda el código generado al compilar. Se crea automáticamente.
- evidencia -> guarda los informes de cada ejecución, las capturas y los vídeos.
- features -> tiene los casos de prueba escritos en Gherkin.
- features/api -> tiene los casos de API.
- features/ui -> tiene los casos de front.
- node_modules -> guarda las librerías que se instalan con npm.
- reports -> guarda informes anteriores y el resultado de algunas comprobaciones.
- scripts -> tiene los archivos que lanzan las pruebas y preparan los informes.
- src -> tiene el código que ejecuta las pruebas.
- src/paginas -> tiene las acciones de las páginas, como entrar o buscar libros.
- src/pasos -> conecta los pasos de los casos con el código.
- src/soporte -> prepara los datos y el navegador para cada prueba.

## GitHub Actions

Hay una acción para revisar el proyecto al subir cambios a main o crear una pull request. También hay otra para ejecutar todas las pruebas.

La segunda necesita una URL privada y su hash en los secretos para descargar las imágenes. También se podría usar un registro privado o un equipo propio. Aún falta probarla en GitHub.

## Cómo ejecutar las pruebas

Con la aplicación ya levantada y Node.js 24 instalado, entra en la carpeta del proyecto y ejecuta:

    npm ci
    npx playwright install chromium
    npm test

Las pruebas se ejecutan en paralelo con tres trabajadores. Para ejecutar solo una parte:

    npm run test:api
    npm run test:ui

Para ver el histórico de evidencias, ejecuta este comando. La terminal mostrará la dirección para abrirlo en el navegador:

    npm run evidencias
