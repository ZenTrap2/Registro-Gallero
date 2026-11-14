# Registro Gallero

Aplicación en español para identificación, genealogía, salud, alojamiento y cuidados responsables. Construida con React, TypeScript y Vite. No requiere servidor de datos ni cuenta propia de la aplicación.

## Instalar y ejecutar

Requiere Node.js 22.13+ o 24+ y npm.

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

## Diseño de las fichas PDF

Las fichas usan la paleta marfil, verde bosque y terracota de la interfaz, tarjetas de datos, secciones numeradas y pies de página. La misma ilustración vectorial del gallo que usa la web aparece cuando no hay foto o esta no puede leerse. La tipografía Liberation Sans está incluida en el PDF para asegurar acentos y consistencia visual sin descargas externas (licencia en `src/assets/FONT-LICENSE.txt`). Las notas y el historial continúan en nuevas páginas cuando es necesario. Cada gallo comienza en una página propia en exportaciones múltiples.

## Administración de categorías

La pestaña Administración permite cambiar el nombre de PL y de los catálogos de propósito, raza, color, estado sanitario y tipo de evento; también añade, renombra y elimina opciones. Cambiar el nombre de PL conserva su validación de entero opcional no negativo y su significado de cantidad de criaderos. Renombrar opciones actualiza fichas y eventos asociados; borrar opciones en uso se bloquea para no dejar datos sin clasificar. El catálogo de raza y color funciona como sugerencia y permite texto libre.

Se crea un PIN local de 6 a 12 dígitos en el primer acceso. El PIN se deriva con PBKDF2-SHA256 y una sal aleatoria; se guarda en localStorage separado de los datos exportados. Se bloquea al salir de la pestaña o tras diez minutos y se puede cambiar después de desbloquear. Es una protección contra cambios casuales de la interfaz, no un sistema de autenticación multiusuario ni protección frente a quien controle el navegador. No hay recuperación por correo. Para permisos reales entre usuarios sería necesario un servicio de autenticación.

La configuración de categorías se guarda en IndexedDB dentro de la base local y se incluye en el JSON exportado. La importación ordinaria conserva la configuración local para evitar cambios sin pasar por Administración; los valores importados se conservan y aparecen entre las opciones existentes. El PIN no se incluye en ninguna exportación.

## Windows y Android

El mismo código React se empaqueta con Electron para Windows x64 y Capacitor para Android 7.0 o posterior (API 24+). La aplicación instalada funciona sin servidor ni cuenta propia. Los registros y fotografías permanecen en IndexedDB dentro de cada instalación. No comparten automáticamente los datos de la versión web: exporta un JSON completo en el origen e impórtalo en el destino.

### Windows

```sh
npm ci
npm run build:windows
```

El ejecutable portable queda en `release/windows/Registro-Gallero-1.0.0-Windows-x64-Portable.exe`. Incluye el navegador necesario y no requiere instalar Node.js. Los datos se guardan en el perfil local de Registro Gallero, no junto al ejecutable. Una dirección interna estable conserva el origen del almacenamiento aunque cambie la carpeta de extracción. Solo los recursos locales de la aplicación pueden abrirse en esa ventana. La compilación no tiene una firma digital comercial.

También se puede generar un instalador NSIS con `npm run build:windows:installer`, preferiblemente desde Windows; para generar el instalador NSIS completo desde Linux se requiere Wine. La versión portable se puede compilar desde Linux sin Wine. Electron mantiene aislado el código web de Node.js y los archivos exportados utilizan el diálogo nativo de guardar.

### Android

Requiere JDK 21 completo (incluido `javac`), Android SDK Platform 36, Build-Tools 35.0.0 y 36.0.0, y las licencias del SDK aceptadas. Configura `ANDROID_HOME` y `JAVA_HOME`, o configura el SDK en Android Studio. El archivo `android/local.properties` es local y no se guarda en Git.

```sh
npm ci
npm run build:android
```

El APK de prueba firmado queda en `android/app/build/outputs/apk/debug/app-debug.apk`. Para abrir el proyecto en Android Studio: `npm run android:sync` y `npm run android:open`. El APK de prueba sirve para instalar directamente en un dispositivo; no es una publicación de Google Play. Una publicación de producción requiere una clave de firma propia y conservarla para futuras actualizaciones. No se incluyen claves de firma ni PIN en el repositorio.

En Android, PDF, JSON y CSV se preparan en la caché privada y se ofrecen mediante el selector nativo de guardar/compartir. La selección de fotografías y archivos utiliza el selector del sistema. No se habilitan copias automáticas externas de los datos de la app. Exporta un JSON antes de desinstalar, cambiar la firma de una compilación o borrar sus datos.

Los binarios nativos son independientes del despliegue web. `npm run build` continúa generando la web en `dist/`; `release/`, el SDK, las cachés, las claves y los resultados de Gradle se excluyen de Git.

### Página de descarga

Después de compilar ambas plataformas, `npm run package:downloads` crea `dist/downloads/`. Para respetar el límite de archivos del alojamiento, divide el ejecutable de Windows en partes de 24 MiB. La página las reúne en memoria, valida tamaño y SHA-256, y entrega un solo `.exe`. Android se descarga directamente. La página muestra el progreso y explica los fallos. Los archivos nativos no se guardan en Git; los genera la compilación.
