# Prueba de estrés · Registro Gallero 1.1.0

Realizada el 17 de noviembre de 2026 en un entorno Linux de desarrollo, con Chromium sin interfaz. No se modificó la base del usuario. La prueba usa un contexto de navegador aislado y responde a solicitudes desde el paquete compilado mediante interceptación local; no necesita publicar datos ni servidor de pruebas. No equivale a una instalación probada en Windows o en un teléfono físico.

## Datos de prueba

- 1.600 animales principales: 800 con 30 ancestros manuales detallados y 800 con linaje heredado de fichas registradas.
- 30 fichas adicionales de ancestros registrados, con información ancestral de apoyo.
- 48.000 posiciones verificadas en los animales principales; cuatro generaciones completas.
- 4.890 eventos de salud y cuidados, con vínculos comprobados.
- 800 fotografías principales y 1.600 fotografías de ancestros manuales. Se reutilizan 32 JPEG sintéticos de 640 × 480 para probar la deduplicación sin consumir servicios de generación ni almacenamiento innecesario. Esta carga no representa 2.400 fotografías diferentes de 5 MB.
- 80 ubicaciones de comprobantes PDF, categorías de texto y entero, notas y datos de fallecimiento.

## Resultados medidos

| Operación | Resultado en este equipo |
| --- | --- |
| Generar, comprobar linaje y guardar el conjunto | 1628 ms |
| Volver a abrir y leer metadatos | 305 ms |
| Editar una ficha conservando el resto | 103 ms |
| Espacio estimado de IndexedDB | 4,423,680 bytes |
| Heap JS observado después de la carga | 83,144,697 bytes; no es una medición del pico máximo |
| Exportación JSON con imágenes y comprobantes | 48,194,687 bytes en 4037 ms |
| Revisar esa copia con el Worker e importar exactamente 100 duplicados como distintos | 6018 ms |
| Registros después del lote | 1.730, todos con ID distinto |

Se comprobaron de nuevo fotografías, comprobantes del animal y su ancestro, estado vital y fechas después de la importación. La restauración completa de JSON y CSV con 1.630 fichas y 4.890 eventos también se prueba con fake-indexeddb. CSV conserva el estado vital y los datos textuales del linaje; no contiene fotografías ni comprobantes.

## Pantallas

Se verificaron 19 tamaños: 320 × 568, 360 × 800, 393 × 852, 412 × 915, 600 × 960, 768 × 1024, 800 × 1280, 912 × 1368, 1024 × 768, 1280 × 800, 1440 × 900, 1920 × 1080, 344 × 740, 853 × 480, 1536 × 695, 924 × 1480, 1480 × 924, 2560 × 1440, 402 × 874.

Todas las páginas del listado quedaron sin desbordamiento horizontal del documento. El formulario cabe en cada ventana y desplaza su contenido internamente. Se comprueba también que solo se renderice la página de 20 fichas, no miles de tarjetas. Se guardan capturas de listas, formularios y una ficha en la carpeta de resultados. Los tamaños de tablet en vertical y horizontal incluyen 924 × 1480 y 1480 × 924; no se afirma que se haya usado físicamente un modelo concreto.

## Fallos corregidos

- La tabla de escritorio provocaba desbordamiento del documento en ventanas intermedias. Se contiene el desplazamiento de la tabla y se cambia a navegación compacta y tarjetas hasta 1.100 px.
- Editar el nombre de un ancestro manual podía eliminar propiedades adicionales. La edición conserva sus datos, incluidos fallecimiento y comprobantes.
- La búsqueda declaraba una caché sin utilizarla. Ahora reutiliza el texto normalizado por base inmutable e incluye nombres manuales y categorías adicionales.
- Los adjuntos binarios se procesan en el almacén local de archivos, se deduplican y se cargan bajo demanda. Generar PDF evita cargar los comprobantes que no va a incrustar.
- La prueba de exportación Android compara los bytes reensamblados de un archivo de más de 2 MB y verifica la escritura por bloques, sin una comparación de millones de propiedades JS que agotaba el tiempo de la prueba.

## Reproducir

```sh
npm ci
npm test
npm run build
CHROMIUM_PATH=/ruta/a/chromium STRESS_OUTPUT_DIR=/ruta/a/resultados npm run test:stress:browser
```

La prueba de navegador requiere Chromium instalado. Sus resultados y las capturas no forman parte del producto; `.stress-output/` está excluida de Git. Las cifras dependen del dispositivo, de la memoria disponible y del tamaño y diversidad de fotografías y documentos. Persisten las pruebas de cuota agotada, migración y escrituras rechazadas sin sobrescribir datos.

## Compilaciones verificadas

Windows x64 portable y APK Android de prueba 1.1.0 generados después de las pruebas. Los assets incluidos en `app.asar` y en el APK coinciden byte a byte con la web sometida a prueba. Se verificó la firma del APK y coincide con 1.0.0; `versionCode=2`. Las sumas SHA-256 están en [COMPROBACIONES-1.1.0.txt](COMPROBACIONES-1.1.0.txt). El APK usa firma de depuración y Windows no dispone de firma comercial. No se probó la instalación en dispositivos físicos.
