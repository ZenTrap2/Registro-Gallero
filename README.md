# Registro Gallero

Aplicación en español para identificación, genealogía, salud, alojamiento y cuidados responsables. Construida con React, TypeScript y Vite. No requiere servidor de datos ni cuenta propia de la aplicación.

## Instalar y ejecutar

Requiere Node.js 20.19+ o 22.12+ y npm.

```sh
npm install
npm run dev
```

Para comprobar y compilar:

```sh
npm test
npm run build
```

El resultado estático queda en `dist/`. Puede alojarse en cualquier servidor de archivos estáticos. Use siempre el mismo origen (protocolo, dominio y puerto) para acceder a los mismos datos locales.

## Datos y copias de seguridad

IndexedDB conserva fichas, fotos (data URLs locales) y eventos. No se envían datos ni fotos a servicios externos. No hay analíticas, fuentes remotas ni imágenes externas. Los ejemplos se crean una sola vez, cuando no existe la base inicial, y se identifican como ficticios. Una base vaciada por el usuario permanece vacía.

JSON exporta la base completa; CSV exporta únicamente campos textuales de las fichas. Para importar CSV, use la cabecera del archivo exportado (`name,code,birth,age,breed,color,father,mother,arrival,notes,status,lastReview`). Las fechas usan YYYY-MM-DD; father y mother contienen identificadores internos, conservados en JSON. Los códigos se comparan sin distinguir mayúsculas. La vista previa lista errores y permite omitir duplicados o actualizar con confirmación. El límite de importación es 60 MB. Fotos JPG/PNG: máximo 5 MB y 8 por registro.

Los datos son propios de cada navegador y dispositivo; borrar los datos del sitio, usar navegación privada o cambiar de origen puede hacerlos inaccesibles. Exporte JSON regularmente. El alojamiento privado de Sites puede solicitar acceso al propietario; la aplicación no utiliza cuentas para almacenar registros.

## Organización

- `src/data.ts`: tipos, IndexedDB, CSV, validación y combinación de importaciones.
- `src/main.tsx`: navegación, componentes reutilizables, formularios y pantallas.
- `src/style.css`: paleta, diseño responsive y estilos accesibles.
- `tests/data.test.ts`: persistencia, portabilidad y manejo de duplicados.

El enfoque es exclusivamente el bienestar y la identificación. No incluye funciones de combate o apuestas.
