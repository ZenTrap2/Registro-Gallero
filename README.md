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

JSON exporta la base completa; CSV exporta únicamente campos textuales de las fichas. Para importar CSV, use la cabecera del archivo exportado (`name,code,birth,age,breed,color,father,mother,arrival,notes,status,lastReview,weightKg,farmId,origin,mark,purpose,farmName`). Las fechas usan YYYY-MM-DD; father y mother contienen identificadores internos, conservados en JSON. Los códigos se comparan sin distinguir mayúsculas. La vista previa lista errores y permite omitir duplicados o actualizar con confirmación. El límite de importación es 60 MB. Fotos JPG/PNG: máximo 5 MB y 8 por registro.

Los datos son propios de cada navegador y dispositivo; borrar los datos del sitio, usar navegación privada o cambiar de origen puede hacerlos inaccesibles. Exporte JSON regularmente. El alojamiento privado de Sites puede solicitar acceso al propietario; la aplicación no utiliza cuentas para almacenar registros.

## Organización

- `src/data.ts`: tipos, IndexedDB, CSV, validación y combinación de importaciones.
- `src/main.tsx`: navegación, componentes reutilizables, formularios y pantallas.
- `src/style.css`: paleta, diseño responsive y estilos accesibles.
- `tests/data.test.ts`: persistencia, portabilidad y manejo de duplicados.

El enfoque es exclusivamente el bienestar y la identificación. No incluye funciones de combate o apuestas.

El peso es opcional y se registra en kilogramos (hasta tres decimales). Se conserva en JSON y en la columna CSV `weightKg`; los archivos y registros anteriores sin peso siguen siendo compatibles.

## Criaderos, campos opcionales y filtros

En Criaderos se registran y editan nombre, ubicación, contacto y notas. Cada gallo puede tener un criadero actual; procedencia, marca y propósito son datos independientes, opcionales y editables. Todos los datos de la ficha se pueden cambiar desde Editar, incluyendo código, progenitores, fotos, fechas y peso. El botón Registrar gallo permanece fijo en pantalla.

Mis gallos muestra registros de todos los criaderos por defecto. Más filtros combina criadero, raza, estado, mes y año de nacimiento, propósito y rango de peso. La búsqueda incluye texto de la ficha, nombres de padres y nombre del criadero. Ver todos / limpiar filtros restablece la vista.

La ficha individual descarga un PDF local con datos, fotos e historial individual de cuidados. También se exportan las fichas de resultados filtrados en Mis gallos. Se genera con jsPDF sin subir información. El PDF es una presentación, no un formato de restauración. JSON incluye todos los criaderos y sus datos; CSV incluye nombre del criadero para restaurar la asociación, pero no ubicación, contacto ni notas del criadero. En importación los criaderos se comparan por nombre y se reasignan los identificadores de sus gallos; se actualizan únicamente tras la confirmación de importar con opción de actualización.

La página Ayuda, en el menú lateral, explica cada función y los formatos de copia de seguridad.

## PL

Campo manual, opcional y editable que cuenta cuántos criaderos ha tenido el gallo, sin registrar sus nombres. No se recalcula al cambiar el criadero actual. Acepta enteros no negativos; vacío significa desconocido y es distinto de cero. Se muestra en lista, ficha y PDF, y se conserva en JSON y en la columna CSV `pl`. Más filtros permite elegir un valor de PL o registros sin datos.
