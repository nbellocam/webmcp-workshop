# Paso 4 — API imperativa: tools en JavaScript

> Paso 4 de 7 · [Índice del workshop](../../README.md)

Ver el detalle de un hotel o agregarlo a la reserva no son forms. Para eso usamos `document.modelContext.registerTool()`, que es el corazón de WebMCP.

Reemplazá `app/src/webmcp.js` por [`files/src/webmcp.js`](files/src/webmcp.js) y vamos por partes.

## 4.1 La forma de un tool

```javascript
const getHotelDetails = tool({
  name: 'get-hotel-details',
  description:
    'Get the full details of a hotel, including price per night and user reviews. ' +
    'Use the hotel id returned by the search-hotels tool.',
  inputSchema: {
    type: 'object',
    properties: {
      hotelId: { type: 'integer', description: 'Hotel id, as returned by search-hotels.' },
    },
    required: ['hotelId'],
  },
  annotations: { readOnlyHint: true },
  async execute({ hotelId }) {
    const hotel = getHotel(hotelId);
    if (!hotel) return `Error: there is no hotel with id ${hotelId}. Use search-hotels to find valid ids.`;
    renderDetail(hotel.id); // la UI siempre refleja lo que hizo el agente
    return { ...summary(hotel), userReviews: hotel.reviews };
  },
});
```

- `name`, `description` e `inputSchema` son los mismos tres campos que en un tool de MCP. El schema es JSON Schema.
- `execute(input, { signal })` recibe el input ya parseado como objeto. Puede devolver un string o cualquier valor serializable a JSON.
- La descripción referencia a otro tool (`search-hotels`). Así el modelo sabe de dónde sacar el `hotelId` sin que se lo expliquemos en un prompt.
- `renderDetail()` hace que el tool actualice la UI: el usuario ve lo mismo que si hubiera hecho click en "Ver".

## 4.2 Los errores se devuelven, no se tiran

Si `execute` tira una excepción, quien llamó al tool recibe un error genérico y no ve tu mensaje. El spec dice `OperationError`; en Chrome 157 llega un `UnknownError: Tool was executed but the invocation failed`. Para que el modelo tenga con qué corregirse, el error tiene que volver como resultado.

Para no repetir el `try/catch` en cada tool, el archivo tiene un helper chiquito que además deja registro en el panel de actividad:

```javascript
function tool({ execute, ...definition }) {
  return {
    ...definition,
    async execute(input, options) {
      log(`🤖 ${definition.name} ${JSON.stringify(input)}`);
      try {
        return await execute(input, options);
      } catch (error) {
        return `Error: ${error.message}`;
      }
    },
  };
}
```

`addToBooking()` en `hotels.js` valida que la fecha exista, que no sea pasada y que las noches estén entre 1 y 14. El schema también lo declara (`format: 'date'`, `minimum`, `maximum`), pero el schema es una ayuda para el modelo, no una garantía: validá en el código. Los mensajes de error están en inglés porque los lee el modelo, igual que las descripciones.

## 4.3 Annotations

```javascript
annotations: { readOnlyHint: true }
```

| Annotation | Significa |
|---|---|
| `readOnlyHint` | No modifica nada. El agente lo puede llamar sin pedir permiso |
| `untrustedContentHint` | El resultado trae contenido que no controlás (lo vemos en el paso 5) |
| `consequentialHint` | Tiene consecuencias difíciles de deshacer (también en el paso 5) |
| `debugging` | El tool es para depurar y no debería ofrecerse en uso normal (Chrome 156+) |

Son *hints*: le dan información al agente y al browser para decidir cuándo pedir confirmación, pero no hacen nada por sí solos.

## 4.4 Tamaños

Todo lo que escribís en un tool termina en el contexto del modelo. La [guía de Chrome](https://developer.chrome.com/docs/ai/webmcp/secure-tools) sugiere estos topes:

| Qué | Tope |
|---|---|
| Nombre del tool y de cada parámetro | 30 caracteres |
| Descripción del tool | 500 caracteres |
| Descripción de cada parámetro | 150 caracteres |
| Resultado | 1.500 caracteres |

Por eso `summary()` recorta los hoteles y `search-hotels` devuelve como mucho 10.

## 4.5 Tools dinámicos

`remove-from-booking` no tiene sentido si la reserva está vacía. Si lo registramos siempre, ocupa lugar en el contexto del modelo y lo invita a usarlo cuando no corresponde.

La forma de dar de baja un tool es un `AbortController`:

```javascript
let bookingTools = null; // AbortController de los tools que dependen del estado

function syncBookingTools(booking) {
  const active = booking.items.length > 0 && !booking.confirmed;

  if (active && !bookingTools) {
    bookingTools = new AbortController();
    const { signal } = bookingTools;
    register(removeFromBookingTool, { signal });
  }

  if (!active && bookingTools) {
    bookingTools.abort(); // abort() da de baja todos los tools registrados con ese signal
    bookingTools = null;
  }
}

// ...
onBookingChange(syncBookingTools);
```

Un mismo `signal` puede dar de baja varios tools de una vez. Es el mismo patrón que usás para limpiar event listeners, y encaja bien con el desmontaje de componentes en una SPA. Dar de baja un tool no cancela una ejecución que ya está en curso: `remove-from-booking` puede vaciar la reserva (y darse de baja a sí mismo) sin problemas.

> Si venís de versiones anteriores de la API: `unregisterTool()` y `provideContext()` ya no existen. El `signal` es la única forma de dar de baja un tool.

## 4.6 Registrar al cargar

```javascript
function register(definition, options) {
  document.modelContext.registerTool(definition, options).catch((error) => log(`⚠️ ${definition.name}: ${error.message}`));
}

register(getHotelDetails);
register(addToBookingTool);
register(getBookingTool);
```

`registerTool` devuelve una promesa que rechaza si el nombre está repetido o el schema es inválido; sin el `catch`, ese error se pierde en la consola. Por defecto, registrá los tools al cargar y dejá el registro dinámico para los que dependen del estado.

## Probalo en vivo

Con el Inspector abierto (si la lista no se actualiza, cerralo y abrilo de nuevo), mirá cómo cambia la lista y el badge de arriba:

| Acción | Qué muestra |
|---|---|
| Ejecutá `add-to-booking` con `{"hotelId": 12, "checkIn": "2026-12-10", "nights": 3}` | Aparece en la reserva y se registra `remove-from-booking` (el badge pasa de 4 a 5 tools) |
| Ejecutá `add-to-booking` con `{"hotelId": 999, "checkIn": "2026-12-10", "nights": 3}` | Vuelve `Error: There is no hotel with id 999.` como resultado, no como excepción |
| Ejecutá `add-to-booking` con `{"hotelId": 12, "checkIn": "2020-01-01", "nights": 3}` | Vuelve el error de fecha pasada, con la fecha de hoy para que el modelo corrija |
| Quitá el hotel desde la UI | `remove-from-booking` desaparece de la lista |
| Ejecutá `get-hotel-details` con `{"hotelId": 24}` | El detalle se abre en la página, como si hubieras hecho click |

Archivo de este paso: [`files/src/webmcp.js`](files/src/webmcp.js).

---

[← Paso 3](../03-api-declarativa/README.md) · [Índice](../../README.md) · [Paso 5: Confirmación y seguridad →](../05-confirmacion-y-seguridad/README.md)
