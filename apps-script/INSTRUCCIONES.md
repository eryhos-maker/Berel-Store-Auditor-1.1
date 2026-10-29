# Conectar la app de auditorías con Google Sheets

## Ya está publicado (29/10/2026)

- **Hoja:** "Auditorías Ferre Don Nico" en eryhos@gmail.com (id `1IZhyf5fA3csy-Nz6viBy1wVMstmPn4wPJUf9znt3Clk`).
- **Script:** ligado a esa hoja; `.clasp.json` tiene su ID.
- **Implementación web:** `AKfycbxODjnQqxJXBv3dC1elvo6cDgVscAtm4ULtIREcPqV6wKHVIEj3jzbOiLZuxXpTXWONAQ`.
- **Clave:** en Propiedades del script (`CLAVE`) y en `conexion-apps-script.local` (PC de gerencia). **No se sube a GitHub.**
- **Vercel (proyecto bsa1):** `VITE_SHEETS_URL` y `VITE_SHEETS_KEY` puestas solo en *Preview*.

Para actualizar el script: `clasp push --force` y luego
`clasp update-deployment AKfycbxODjnQqxJXBv3dC1elvo6cDgVscAtm4ULtIREcPqV6wKHVIEj3jzbOiLZuxXpTXWONAQ` (así la URL no cambia).

---

Lo de abajo es cómo se hace a mano, por si hay que repetirlo en otra cuenta.

Se hace una sola vez y toma unos 15 minutos. Al terminar tendrás una **dirección (URL)** y una **clave** que se ponen en Vercel.

## 1. Crear la hoja

1. Entra a [sheets.google.com](https://sheets.google.com) con tu cuenta (eryhos@gmail.com).
2. Crea una hoja en blanco y nómbrala **Auditorías Ferre Don Nico**.

## 2. Pegar el código

1. En la hoja abre **Extensiones → Apps Script**.
2. Borra lo que trae `Código.gs` y pega todo el contenido de [`Code.gs`](Code.gs).
3. Da clic en **Guardar** (disquete).

## 3. Crear las pestañas

1. Arriba, en la lista de funciones, elige **setup** y da clic en **Ejecutar**.
2. Google pedirá permisos (hojas de cálculo y Drive): elige tu cuenta → **Configuración avanzada** → **Ir a … (no seguro)** → **Permitir**. Dice "no seguro" porque el script es tuyo y Google no lo revisó.
3. Revisa la hoja: deben aparecer las pestañas `Tiendas`, `Personal`, `Berel_Auditorias` y `Berel_Resultados`. En tu Drive aparece la carpeta **Auditorías** con **Fotos** y **Firmas**.

`setup` se puede volver a correr cuando quieras: solo crea lo que falte, no borra nada.

## 4. Poner la clave

1. En Apps Script: **Configuración del proyecto** (engrane, a la izquierda).
2. **Propiedades de la secuencia de comandos → Agregar propiedad**.
3. Propiedad: `CLAVE` · Valor: una clave larga que inventes. No la mandes por chat ni la guardes en GitHub.
4. **Guardar propiedades de la secuencia de comandos**.

## 5. Publicar como aplicación web

1. **Implementar → Nueva implementación** → engrane → **Aplicación web**.
2. Descripción: *Auditorías v1* · Ejecutar como: **Yo** · Quién tiene acceso: **Cualquier usuario**.
3. **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).

> "Cualquier usuario" es para que los celulares puedan llamar al script sin iniciar sesión en Google. Lo que protege los datos es la **clave**: sin ella el script no entrega ni guarda nada.

## 6. Variables en Vercel

En Vercel → proyecto de la app → **Settings → Environment Variables**, agrega:

| Nombre | Valor |
|---|---|
| `VITE_SHEETS_URL` | la URL del paso 5 |
| `VITE_SHEETS_KEY` | la clave del paso 4 |

Para probar sin tocar la app de todos los días, márcalas solo en **Preview**. Cuando todo esté bien, se agregan también a **Production**. Después de cambiarlas hay que volver a desplegar (la app las lee al construirse).

> La clave queda dentro de la app publicada (igual que en tus otras apps). Sirve para que nadie que solo conozca la dirección del script pueda leer o escribir; si algún día se filtra, cámbiala en el paso 4 y en Vercel.

## Si cambias el código después

**Implementar → Administrar implementaciones → ✏️ → Versión: Nueva versión → Implementar**. Así la URL no cambia.

## Qué guarda cada pestaña

| Pestaña | Contenido |
|---|---|
| `Tiendas` | Una fila por tienda Berel. `Activo` = No la oculta de la lista sin borrarla. |
| `Personal` | Gerentes y auditores Berel (`Rol` = Gerente o Auditor). |
| `Berel_Auditorias` | Una fila por auditoría: folio, tienda, gerente, auditor, puntaje, estatus y link de las firmas. |
| `Berel_Resultados` | Una fila por pregunta de cada auditoría: folio, pregunta, puntos y observación. |

- El **folio** lo pone el script: `AB-AAAAMMDD-0001`, consecutivo del día.
- Las **firmas** se guardan como imagen en Drive (Auditorías/Firmas); en la hoja va el link.
- Puedes corregir datos directo en la hoja. No cambies los nombres de los encabezados (fila 1); el orden de las columnas sí se puede mover.

## Problemas comunes

| Mensaje en la app | Qué hacer |
|---|---|
| *Falta configurar la conexión con Google Sheets* | Faltan las variables del paso 6, o no se volvió a desplegar después de ponerlas. |
| *La clave de acceso no es correcta* | La clave en Vercel no es igual a la propiedad `CLAVE`. Revisa mayúsculas y espacios. |
| *Falta configurar la CLAVE en Propiedades del script* | Falta el paso 4. |
| *La hoja no respondió bien…* | La URL no es la de la aplicación web (debe terminar en `/exec`) o el acceso no está en "Cualquier usuario". |
| *La hoja está ocupada guardando otra auditoría* | Dos celulares guardaron al mismo tiempo. Espera unos segundos y vuelve a dar Guardar: no se duplica. |
