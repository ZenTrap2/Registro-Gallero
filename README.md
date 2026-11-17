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

IndexedDB conserva fichas, fotografías originales como Blob y miniaturas y eventos. No se envían datos ni fotos a servicios externos. No hay analíticas, fuentes remotas ni imágenes externas. Los ejemplos se crean una sola vez, cuando no existe la base inicial, y se identifican como ficticios. Una base vaciada por el usuario permanece vacía.

JSON exporta la base completa; CSV exporta únicamente campos textuales de las fichas. Para importar CSV, use la cabecera del archivo exportado (`name,code,birth,age,breed,color,father,mother,arrival,notes,status,lastReview,weightKg,farmId,origin,mark,purpose,farmName`). Las fechas usan YYYY-MM-DD; father y mother contienen identificadores internos, conservados en JSON. Los códigos se comparan sin distinguir mayúsculas. La vista previa lista errores y permite omitir, reemplazar o conservar ambos animales tras revisar coincidencias de nombre, placa/código o ID. El límite de importación es 512 MiB. Fotos JPG/PNG: máximo 5 MB y 8 por registro.

Los datos son propios de cada navegador y dispositivo; borrar los datos del sitio, usar navegación privada o cambiar de origen puede hacerlos inaccesibles. Exporte JSON regularmente. El alojamiento privado de Sites puede solicitar acceso al propietario; la aplicación no utiliza cuentas para almacenar registros.

## Organización

- `src/data.ts`: tipos, IndexedDB, CSV, validación y combinación de importaciones.
- `src/main.tsx`: arranque de React; `src/App.tsx`: pantallas, formularios y coordinación de datos.
- `src/style.css`: paleta, diseño responsive y estilos accesibles.
- `tests/data.test.ts`: persistencia, portabilidad y manejo de duplicados.

El enfoque es exclusivamente el bienestar y la identificación. No incluye funciones de combate o apuestas.

El peso es opcional y se registra en kilogramos (hasta tres decimales). Se conserva en JSON y en la columna CSV `weightKg`; los archivos y registros anteriores sin peso siguen siendo compatibles.

## Criaderos, campos opcionales y filtros

En Criaderos se registran y editan nombre, ubicación, contacto y notas. Cada gallo puede tener un criadero actual; procedencia, marca y propósito son datos independientes, opcionales y editables. Todos los datos de la ficha se pueden cambiar desde Editar, incluyendo código, progenitores, fotos, fechas y peso. El botón Registrar gallo permanece fijo en pantalla.

Mis gallos muestra registros de todos los criaderos por defecto. Más filtros combina criadero, raza, estado, mes y año de nacimiento, propósito y rango de peso. La búsqueda incluye texto de la ficha, nombres de padres y nombre del criadero. Ver todos / limpiar filtros restablece la vista.

La ficha individual descarga un PDF local con datos, fotos e historial individual de cuidados. También se exportan las fichas de resultados filtrados en Mis gallos. Se genera con jsPDF sin subir información. El PDF es una presentación, no un formato de restauración. JSON incluye todos los criaderos y sus datos; CSV incluye nombre del criadero para restaurar la asociación, pero no ubicación, contacto ni notas del criadero. En importación los criaderos se comparan por nombre y se reasignan los identificadores de sus gallos; los criaderos ya existentes conservan sus datos en la importación revisada.

La página Ayuda, en el menú lateral, explica cada función y los formatos de copia de seguridad.

## PL

Campo manual, opcional y editable que cuenta cuántos criaderos ha tenido el gallo, sin registrar sus nombres. No se recalcula al cambiar el criadero actual. Acepta enteros no negativos; vacío significa desconocido y es distinto de cero. Se muestra en lista, ficha y PDF, y se conserva en JSON y en la columna CSV `pl`. Más filtros permite elegir un valor de PL o registros sin datos.

## Diseño de las fichas PDF

Las fichas usan la paleta marfil, verde bosque y terracota de la interfaz, tarjetas de datos, secciones numeradas y pies de página. La misma ilustración vectorial del gallo que usa la web aparece cuando no hay foto o esta no puede leerse. La tipografía Liberation Sans está incluida en el PDF para asegurar acentos y consistencia visual sin descargas externas (licencia en `src/assets/FONT-LICENSE.txt`). Las notas y el historial continúan en nuevas páginas cuando es necesario. Cada gallo comienza en una página propia en exportaciones múltiples.

## Administración de categorías

La pestaña Administración permite cambiar el nombre de PL y de los catálogos de propósito, raza, color, estado sanitario y tipo de evento; también añade, renombra y elimina opciones. Cambiar el nombre de PL conserva su validación de entero opcional no negativo y su significado de cantidad de criaderos. Renombrar opciones actualiza fichas y eventos asociados; borrar opciones en uso se bloquea para no dejar datos sin clasificar. El catálogo de raza y color funciona como sugerencia y permite texto libre.

Se crea un PIN local de 6 a 12 dígitos en el primer acceso. El PIN se deriva con PBKDF2-SHA256 y una sal aleatoria; se guarda en localStorage separado de los datos exportados. Se bloquea al salir de la pestaña o tras diez minutos y se puede cambiar después de desbloquear. Es una protección contra cambios casuales de la interfaz, no un sistema de autenticación multiusuario ni protección frente a quien controle el navegador. No hay recuperación por correo. Para permisos reales entre usuarios sería necesario un servicio de autenticación.

La configuración de categorías se guarda en IndexedDB dentro de la base local y se incluye en el JSON exportado. La importación ordinaria conserva la configuración local para evitar cambios sin pasar por Administración; los valores importados se conservan y aparecen entre las opciones existentes. Los PIN y la recuperación no se incluyen en ninguna exportación.

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

## Interfaz adaptable y validación

La interfaz utiliza el alto visible del dispositivo y zonas seguras de pantalla, con controles táctiles de al menos 44 px y campos de 16 px en teléfonos. En pantallas estrechas y tabletas táctiles, la navegación se abre en un diálogo que mantiene el foco y bloquea el desplazamiento del fondo. Los registros se muestran como tarjetas en móvil y como tabla en escritorio, con paginación de veinte registros para listas largas. Los filtros se reinician al navegar y solo afectan al listado de Mis gallos.

Los formularios pasan a una columna en teléfonos. Sus encabezados y acciones permanecen accesibles con desplazamiento interno; los avisos se muestran en el diálogo superior, incluso en confirmaciones anidadas. Los cambios de altura del teclado actualizan el espacio disponible. La configuración Android de Capacitor utiliza gestión nativa de insets, `viewport-fit=cover`, barras claras y `adjustResize`; estos cambios nativos se aplican al generar el siguiente APK.

La búsqueda ignora acentos y espacios alrededor del texto. La importación valida fechas reales, identificadores repetidos, seguimientos y parentescos. CSV incluye ahora el identificador propio de cada registro para conservar los vínculos de linaje al restaurarlo. Los archivos antiguos continúan aceptándose cuando contienen los campos obligatorios. Una importación que genere ciclos con registros existentes se detiene sin modificar los datos previos.

Las pruebas de interacción en `tests/ui.test.tsx` usan jsdom y cubren navegación, filtros, edición, errores de almacenamiento, confirmaciones, paginación, métricas del teclado y el botón Atrás de Android. Estas pruebas no reemplazan una comprobación visual en un teléfono real.

## Criaderos grandes y transferencia por lotes

El almacenamiento IndexedDB v3 separa gallos, eventos, criaderos y fotografías. Las escrituras son atómicas e incrementales: editar una ficha no vuelve a guardar todas las fotos. Los originales se conservan como Blob, se deduplican por contenido y disponen de miniaturas; la interfaz solo carga las imágenes visibles. La migración del formato anterior conserva los identificadores y solo elimina la copia antigua después de confirmar la transacción. Si falla por falta de espacio, conserva los datos para reintentar. Los cambios basados en una versión antigua se rechazan para evitar sobrescribir otra pestaña.

Mis gallos, Linaje y Salud tienen listas paginadas de 20, 50 o 100 elementos. Mis gallos permite seleccionar animales entre páginas y filtros, todos los resultados o una cantidad exacta. «Seleccionar cantidad» reemplaza la selección por los primeros resultados en el orden mostrado. El peso continúa visible en tablas y tarjetas.

Exportar permite elegir todos los animales, los seleccionados o el resultado filtrado, y reducir la cantidad exacta. JSON incluye los originales; CSV solo texto y códigos de progenitores; PDF permite omitir fotografías para lotes grandes. Una copia parcial incluye únicamente los animales elegidos, sus eventos y criaderos vinculados. No añade progenitores fuera de la selección: guarda referencias por código que se resuelven si ya existen al importar. Una copia completa incluye también configuración y eventos generales.

La importación JSON/CSV se procesa en un Web Worker cuando está disponible. La vista previa paginada muestra los errores y permite seleccionar registros o una cantidad antes de la confirmación y elegir omitir o actualizar duplicados. El original de las fotografías se conserva aunque no aparezca en la lista de previsualización. El límite por archivo es 512 MiB; con muchas fotos se recomienda dividir en lotes. No existe un límite fijo de gallos en la aplicación: el espacio disponible y la memoria del dispositivo condicionan su capacidad. Reportes muestra la estimación de almacenamiento cuando el navegador la ofrece. Conviene conservar copias JSON fuera del navegador.

Las pruebas incluyen 1.500 gallos y 3.000 eventos, deduplicación de fotos, lecturas sin cargar imágenes, una sola escritura por ficha modificada, migración fallida sin pérdida de datos y selección/importación de cantidades con más de 1.000 fichas. IndexedDB se verifica con fake-indexeddb e interacción con jsdom; esto no garantiza tiempos iguales en todos los teléfonos ni sustituye una prueba visual en un dispositivo real. Los cambios web se incluirán en los siguientes binarios nativos; no se regeneran automáticamente las descargas existentes.


## Revisión de coincidencias al importar

Se comparan nombres y placas/códigos ignorando mayúsculas, tildes y espacios sobrantes; también se detecta el mismo ID. Compartir padres o fecha de nacimiento no genera una coincidencia. Se comparan tanto los datos locales como las filas anteriores seleccionadas del propio archivo. Los nombres parecidos sin coincidencia exacta normalizada no se consideran automáticamente el mismo animal.

Cada coincidencia requiere omitir, reemplazar un destino concreto o conservar ambos. Hay acciones por lote y ajustes individuales con previsualización del destino; más de 50 candidatos se localizan mediante búsqueda. Reemplazar conserva el ID del destino y sus enlaces, actualiza ficha y fotos, conserva el historial previo y actualiza eventos importados del mismo ID y del mismo animal. Conservar ambos mantiene los datos visibles y asigna IDs distintos, también a eventos cuyos IDs colisionan. Las placas repetidas se admiten en IndexedDB v3, con migración automática del índice anterior. Dos filas no pueden reemplazar simultáneamente un único destino. Si un padre externo solo se identifica por un código compartido por varios animales, se conserva el nombre manual cuando está disponible y no se adivina el vínculo.

## Categorías adicionales y métodos de acceso

Administración permite crear campos opcionales de texto, entero, decimal, fecha o lista, renombrarlos, retirarlos y restaurarlos. Su tipo queda fijo después de guardar; los enteros se validan como enteros. Retirar mantiene la definición y los valores para poder restaurarlos. Los catálogos del formulario también pueden retirarse sin borrar datos. Las opciones en uso requieren cambiar primero sus registros para poder eliminarlas. JSON incluye definiciones; CSV agrega columnas JSON de texto `customValues`, `customFields` y `ancestry`, sin imágenes. Al importar se conservan las etiquetas locales y se incorporan definiciones nuevas; un conflicto de tipos se rechaza sin guardar.

Desde Administración se configuran la pregunta de recuperación y un PIN maestro propio distinto del principal. «¿Olvidaste tu PIN?» permite responder y establecer otro PIN; «Otro método de acceso» permite entrar con el maestro. No existe un PIN maestro predeterminado. Cambiar estos métodos requiere confirmar el PIN principal o maestro actual. Ambos PIN y la respuesta se derivan con PBKDF2-SHA256, sal aleatoria y 150.000 iteraciones, se almacenan solo en localStorage y se excluyen de copias y exportaciones. La pregunta se guarda legible para poder mostrarla. La respuesta ignora mayúsculas y espacios repetidos, pero conserva las tildes. Los PIN antiguos siguen funcionando y solo tienen recuperación cuando se configura. Estos métodos protegen cambios casuales de la interfaz; no son autenticación de servidor ni se sincronizan entre dispositivos.

## Pedigrí de cuatro generaciones

Cada animal puede tener padre, madre y ancestros hasta tatarabuelos: 2 + 4 + 8 + 16 posiciones. Se permite escribir solo un nombre o añadir una ficha detallada opcional, con fotos y categorías, sin crear otro animal en Mis gallos. Los ancestros manuales no requieren placa. Vincular desde el registro completa automáticamente el linaje conocido y se refleja al actualizar esas fichas. Cambiar a un progenitor registrado pide confirmar si se sustituye una rama manual. La aplicación detecta ciclos en vínculos de ancestros. No infiere ancestros por nombres iguales.

Las generaciones se despliegan de forma independiente para mantener breve el formulario. La ficha permite consultar las cuatro y abrir los animales vinculados. El PDF conserva la estética existente y muestra nombres conocidos por generación; los datos detallados de los ancestros se omiten por defecto y se incluyen solo con la casilla explícita del diálogo de exportación. Exportar ficha PDF abre ese diálogo para elegir las opciones. JSON conserva imágenes de ancestros en el mismo almacén deduplicado; CSV conserva sus datos textuales sin imágenes. Las copias parciales llevan instantáneas del linaje conocido sin añadir registros adicionales a Mis gallos.

## Versión 1.1.0: estrés, fallecimiento y comprobantes

Consulta el [informe reproducible de estrés](docs/PRUEBAS-ESTRES.md): 1.630 fichas, 4.890 eventos, 48.000 posiciones de ancestros de los animales principales, fotos y comprobantes locales, exportación de unos 48 MB e importación revisada de un lote exacto. El script `npm run test:stress:browser` usa Chromium instalado (`CHROMIUM_PATH`) y guarda resultados en `.stress-output/` o `STRESS_OUTPUT_DIR`. No toca datos del usuario ni necesita un servidor de pruebas.

El animal principal y cualquier ancestro manual pueden marcarse como fallecidos y registrar opcionalmente la fecha. No se obliga a añadir esta información y los registros anteriores conservan el estado desconocido. La fecha no puede ser futura ni anterior al nacimiento. El estado vital se conserva en JSON y CSV y puede aparecer en la ficha PDF; los detalles de ancestros siguen requiriendo la opción explícita de exportación.

Cada animal y cada ficha detallada de ancestro admite hasta ocho comprobantes de ascendencia de 10 MB por archivo: PDF, JPG, PNG, WebP, TXT y DOCX. Se valida extensión, tipo, tamaño y las firmas básicas de formatos binarios. Se guardan como Blob en IndexedDB, deduplicados con los demás archivos, y se descargan para abrirlos con el sistema; no se ejecuta su contenido. JSON incluye los originales. CSV y el PDF generado no incrustan esos archivos. En la ficha principal y en el linaje se pueden descargar los comprobantes; al editar se pueden añadir o quitar antes de guardar.

Las versiones nativas 1.1.0 mantienen el identificador de aplicación; Android incrementa `versionCode` a 2. Conserva un JSON antes de una actualización y actualiza usando la misma firma para mantener los datos locales. Las pruebas con Chromium y las verificaciones del paquete no sustituyen probar la instalación en Windows y Android físicos.
