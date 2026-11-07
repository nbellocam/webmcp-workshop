# Paso 3 — API declarativa: el buscador como tool

> Paso 3 de 7 · [Índice del workshop](../../README.md)

El buscador de Rumbo Sur ya es un `<form>` con tres `<select>`. Eso, en el fondo, es una función con tres parámetros opcionales y valores posibles conocidos. La API declarativa nos deja exponerlo como tool sin escribir el schema a mano.

## 3.1 Los atributos en el form

En `app/index.html`, sumale estos atributos al form de búsqueda:

```html
<form
  id="search-form"
  toolname="search-hotels"
  tooldescription="Search hotels in Argentina, Uruguay and Chile by city, country and price tier. Always send the three filters; use an empty string for any filter you do not need, because the form keeps the values of the previous search. Returns how many hotels matched and up to 10 of them, with their id."
  toolautosubmit
>
```

Y un `toolparamdescription` a cada `<select>`:

```html
<select name="location" toolparamdescription="City where the hotel is located. Leave empty to search every city.">
<select name="country" toolparamdescription="Country of the hotel. Leave empty to search every country.">
<select name="priceTier" toolparamdescription="Hotel price tier, from Luxury (most expensive) to Midscale (cheapest).">
```

| Atributo | Para qué |
|---|---|
| `toolname` | El nombre del tool. Letras, números, `_`, `-` y `.` |
| `tooldescription` | Lo que lee el modelo para decidir si lo usa. Pensalo como prompt, no como documentación |
| `toolparamdescription` | La descripción de cada parámetro. Si no está, el browser usa el texto del `<label>` |
| `toolautosubmit` | El agente puede enviar el form solo. Sin este atributo, el browser completa los campos y deja el foco en el botón para que el usuario revise y envíe |

Buscar hoteles no tiene consecuencias, así que acá `toolautosubmit` tiene sentido. En un form de pago no lo pondría.

## 3.2 El schema que arma el browser

Recargá y abrí el Inspector. Aparece `search-hotels` con un schema parecido a este (recortado):

```json
{
  "type": "object",
  "properties": {
    "location": {
      "type": "string",
      "description": "City where the hotel is located. Leave empty to search every city.",
      "enum": ["", "Bariloche", "Buenos Aires", "..."],
      "anyOf": [{ "type": "string", "const": "Bariloche", "title": "Bariloche" }, "..."]
    }
  },
  "required": []
}
```

Cada `<option>` se convierte en un valor del `enum`, con el texto visible como `title`. El modelo tiene la lista cerrada de ciudades, y si igual manda otra, Chrome la rechaza antes de tocar el form (en Chrome 157: `UnknownError: Invalid value "Tokio" for parameter location`). Nosotros no escribimos ni una línea de JSON Schema. Por eso las opciones están escritas en el HTML y no cargadas por JavaScript: es lo que el browser lee para armar el schema.

## 3.3 Devolverle el resultado al agente

Si ejecutás el tool desde el Inspector con `{"location": "Bariloche"}`, los selects se completan, el form se envía y la lista se actualiza. Pero el agente no recibe nada útil: el form no navega a ninguna página de resultados.

Para eso está `respondWith()` en el evento `submit`. Reemplazá `app/src/webmcp.js` por [`files/src/webmcp.js`](files/src/webmcp.js). La parte importante:

```javascript
document.querySelector('#search-form').addEventListener('submit', (event) => {
  if (!event.agentInvoked) return;
  event.preventDefault();
  const results = searchHotels(Object.fromEntries(new FormData(event.target)));
  // Chrome recomienda respuestas cortas (~1.5K caracteres): devolvemos el total y los primeros 10
  const response = { total: results.length, hotels: results.slice(0, 10).map(summary) };
  event.respondWith(Promise.resolve(JSON.stringify(response)));
});
```

- `event.agentInvoked` distingue un envío del agente de uno del usuario. El del usuario sigue igual que antes: lo maneja `ui.js`.
- `preventDefault()` tiene que ir **antes** de `respondWith()`.
- `summary()` recorta cada hotel a los campos que el agente necesita, y la respuesta se corta en 10 resultados. Los 32 hoteles completos son unos 4.500 caracteres, el triple de lo que Chrome recomienda.

> Un detalle que me costó un rato: no llames a `form.reset()` cuando `agentInvoked` es `true`. Chrome lo toma como una cancelación y el agente recibe `Tool execution cancelled by a form reset` en vez de tu respuesta, aunque ya hayas llamado a `respondWith()`. Ver [T7](../../docs/troubleshooting.md#t7-tool-execution-cancelled-by-a-form-reset).

El mismo archivo suma tres listeners sobre `document.modelContext`:

```javascript
document.modelContext.addEventListener('toolactivated', ({ toolName }) => {
  if (document.querySelector(`form[toolname="${CSS.escape(toolName)}"]`)) log(`🤖 ${toolName} (form)`);
});
document.modelContext.addEventListener('toolcancel', ({ toolName }) => log(`✋ ${toolName} cancelado`));
document.modelContext.addEventListener('toolchange', showToolCount);
```

- `toolactivated` se dispara cada vez que un agente invoca un tool. En Chrome pasa con todos, no solo con los declarativos, así que filtramos por los que corresponden a un form. Es lo que alimenta el panel de "Actividad del agente".
- `toolcancel` avisa cuando una ejecución se cancela, por ejemplo si se resetea el form.
- `toolchange` se dispara cuando se registra o se da de baja un tool. `showToolCount` usa `getTools()` para mostrar cuántos hay en el badge; en el paso 6 volvemos sobre `getTools()`, que también sirve para consumir tools.

## 3.4 Feedback visual

Cuando un agente está completando el form, Chrome le aplica dos pseudoclases: `:tool-form-active` al `<form>` y `:tool-submit-active` al botón. Por defecto ya les pone un outline punteado. Si querés algo propio, en `app/src/styles.css`:

```css
form:tool-form-active {
  outline: 2px dashed var(--accent);
  outline-offset: 4px;
}
```

Esto importa: el usuario tiene que ver que el agente está tocando el form.

## Probalo en vivo

Ejecutá `search-hotels` desde el Inspector. Si el Inspector muestra una lista vieja, cerralo y volvelo a abrir ([T2](../../docs/troubleshooting.md#t2-el-inspector-no-muestra-los-tools-o-muestra-una-lista-vieja)).

| Input | Qué muestra |
|---|---|
| `{"location": "Bariloche"}` | `total: 3`, la UI se actualiza y el resultado vuelve como JSON |
| `{"location": "", "country": "Uruguay", "priceTier": "Luxury"}` | `total: 2`: el schema permite combinar filtros |
| `{"location": "", "country": "", "priceTier": ""}` | `total: 32`, pero vuelven solo los primeros 10 |

En las últimas dos filas los campos van explícitos con `""`. Lo comprobé en Chrome 157: si después de buscar Bariloche mandás solo `{"country": "Uruguay", "priceTier": "Luxury"}`, el select de ciudad sigue en Bariloche y la búsqueda devuelve 0. El form es estado: el agente completa los campos que manda y deja el resto como estaba. Por eso la descripción del tool le pide que mande siempre los tres filtros.

Archivos de este paso: [`files/index.html`](files/index.html) y [`files/src/webmcp.js`](files/src/webmcp.js).

---

[← Paso 2](../02-setup/README.md) · [Índice](../../README.md) · [Paso 4: API imperativa →](../04-api-imperativa/README.md)
