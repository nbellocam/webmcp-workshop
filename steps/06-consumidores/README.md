# Paso 6 — Consumidores: quién usa estos tools

> Paso 6 de 7 · [Índice del workshop](../../README.md)

Tenemos cuatro tools que se registran al cargar y dos que aparecen con la reserva. La pregunta obvia es quién los usa. Hoy, noviembre de 2026, el soporte en agentes todavía está llegando: según el [estado de implementación](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md) del repo del spec, ChatGPT Desktop ya lo soporta, Brave lo tiene experimental en Leo, y Gemini en Chrome está anunciado. Para un workshop no podés depender de eso, así que este paso muestra tres formas de consumir los mismos tools que controlás vos.

Ninguna de las tres cambia una línea de `webmcp.js`.

## 6.1 El Inspector

Ya lo venimos usando para ejecutar tools a mano. Además tiene un modo chat: le cargás una API key de Gemini, le escribís en lenguaje natural y él decide qué tools llamar. Es la forma más rápida de ver a un modelo usando tu sitio.

En la versión de 30 minutos, este paso termina acá, con quien presenta haciendo la demo. Probá con:

> Buscame un hotel de lujo en Bariloche, agregá 3 noches desde el 10 de diciembre y confirmá la reserva.

## 6.2 Un agente propio dentro de la página

`document.modelContext` no solo sirve para registrar tools: con `getTools()` y `executeTool()` también se pueden consumir. Eso permite armar un asistente embebido en tu propio sitio que no sabe nada de hoteles: todo lo que puede hacer lo descubre a partir de los tools registrados.

Copiá los archivos del paso sobre `app/`:

```bash
cp -R steps/06-consumidores/files/. app/
```

Son tres: [`src/agent.js`](files/src/agent.js) (el agente), [`src/main.js`](files/src/main.js) (suma `initAgent()`) e [`index.html`](files/index.html) (suma el panel "Asistente" y el script del 6.3).

Configurá la API key y **reiniciá `npm run dev`**, porque Vite lee las variables de entorno al arrancar:

```bash
cp app/.env.example app/.env.local
# editá app/.env.local y completá VITE_GEMINI_API_KEY
```

> ⚠️ La key queda en el bundle del browser. Para el workshop en `localhost` alcanza; si la vas a usar en otro lado, restringila por HTTP referrer en la consola de Google Cloud y ponele un tope de gasto. En producción, la llamada al modelo va detrás de un backend propio.

El agente es un loop:

```javascript
async function run(chat, message) {
  let { tools, config } = await toolConfig();
  let response = await chat.sendMessage({ message, config });

  for (let round = 1; response.functionCalls?.length; round++) {
    const results = [];
    for (const call of response.functionCalls) {
      const result =
        round > MAX_ROUNDS ? 'Error: too many tool calls. Answer with what you have.' : await callTool(tools, call);
      results.push({ functionResponse: { id: call.id, name: call.name, response: { result } } });
    }
    ({ tools, config } = await toolConfig());
    if (round > MAX_ROUNDS) config = { systemInstruction };
    response = await chat.sendMessage({ message: results, config });
  }

  return response.text ?? 'No obtuve una respuesta del modelo. Probá reformulando el pedido.';
}
```

Y `toolConfig()` traduce lo que devuelve `getTools()` al formato de Gemini:

```javascript
const functionDeclarations = tools.map(({ name, description, inputSchema, annotations }) => ({
  name,
  description: annotations?.consequentialHint ? `${description} [consequential]` : description,
  parametersJsonSchema: inputSchema ?? { type: 'object', properties: {} },
}));
```

Lo que vale la pena mirar:

- `getTools()` devuelve el `inputSchema` como objeto, y Gemini lo acepta tal cual en `parametersJsonSchema`.
- La lista de tools **se vuelve a pedir en cada vuelta**. Después de `add-to-booking` aparece `confirm-booking`, y el modelo tiene que enterarse.
- Las annotations no se pierden: los tools con `consequentialHint` llegan marcados en la descripción, y en `callTool()` los resultados de tools con `untrustedContentHint` se envuelven como `{ untrusted: true, content }`. El system prompt le dice al modelo qué hacer con cada marca.
- `callTool()` atrapa los errores de `executeTool()` y responde igual. Si un `functionCall` queda sin respuesta, el chat queda roto para los mensajes siguientes.
- `MAX_ROUNDS` corta el loop si el modelo se enrosca llamando tools: con una key expuesta, no querés un loop infinito.
- `executeTool()` recibe el input como **objeto**. Los docs dicen que pasarlo como JSON string está deprecado desde Chrome 155; en mis pruebas con Chrome 157 directamente falla con `TypeError`.

Esto incluye al tool declarativo: cuando el agente llama a `search-hotels`, el form se completa y se envía solo, igual que con el Inspector.

## 6.3 Desde Claude Code, Claude Desktop o Cursor

Con [MCP-B](https://github.com/WebMCP-org/npm-packages) los tools de la pestaña llegan a cualquier cliente MCP. La pieza es un relay local: la página se conecta por WebSocket a un proceso en tu máquina, y ese proceso es un MCP server stdio para tu cliente.

```
Pestaña con WebMCP ──WebSocket──▶ webmcp-local-relay ──stdio──▶ Claude Code / Cursor
```

Del lado de la página es un script, que ya está en el `index.html` de este paso, con la versión fijada y su hash de integridad:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@mcp-b/webmcp-local-relay@6.0.3/dist/browser/embed.js"
  integrity="sha384-xR0I1T8ge49Ji10bAlgc+TH+1Cqn57FNuNL5wRM/tjFYmpU2DxuEtMKlYz7cRCwZ"
  crossorigin="anonymous"
></script>
```

Toma lo que haya registrado en `document.modelContext`, sea la implementación nativa de Chrome o un polyfill. Si no hay un relay corriendo, vas a ver errores de conexión del WebSocket en la consola; no afectan al resto.

Del lado del cliente, en Claude Code:

```bash
claude mcp add webmcp -- npx -y @mcp-b/webmcp-local-relay@6.0.3 --widget-origin http://localhost:5173,http://localhost:5175
```

En Claude Desktop, Cursor o cualquier cliente que use el formato `mcpServers`:

```json
{
  "mcpServers": {
    "webmcp": {
      "command": "npx",
      "args": [
        "-y",
        "@mcp-b/webmcp-local-relay@6.0.3",
        "--widget-origin",
        "http://localhost:5173,http://localhost:5175"
      ]
    }
  }
}
```

`--widget-origin` limita qué páginas pueden registrar tools en el relay. Sin ese flag acepta cualquier origen, o sea, cualquier sitio que tengas abierto podría exponerle tools a tu cliente.

Después:

1. Reiniciá el cliente (o abrí una sesión nueva de Claude Code) para que levante el server.
2. Recargá la pestaña de Rumbo Sur, así el script se conecta al relay.
3. Pedile que llame a `webmcp_list_sources`: tiene que aparecer la pestaña.

El cliente ve cuatro tools propios del relay (`webmcp_list_sources`, `webmcp_list_tools`, `webmcp_call_tool` y `webmcp_open_page`) y los de Rumbo Sur por nombre. Dos detalles:

- El relay **renombra los tools a snake_case**: `get-hotel-details` llega como `get_hotel_details`. Si tenés el sitio abierto en más de una pestaña, además les agrega un sufijo por pestaña (`get_hotel_details_8c9d`). Del lado de la página no cambia nada.
- Los tools dinámicos también viajan: cuando agregás algo a la reserva, `confirm_booking` y `remove_from_booking` aparecen en el cliente. Si cerrás la pestaña, desaparecen todos.

En el workshop de [MCP Toolbox](https://github.com/nbellocam/travel-agent) el agente veía la base de datos. Acá ve tu sitio, con la sesión del usuario y la UI actualizándose en vivo.

## Probalo en vivo

Con el asistente embebido o desde Claude Code:

| Pedido | Qué muestra |
|---|---|
| "¿Qué hoteles hay en Uruguay?" | Usa el tool declarativo; el form se completa solo |
| "Agregá 2 noches en la Posada del Portón desde el 5 de enero" | Encadena `search-hotels` y `add-to-booking` |
| "Contame qué dicen de la Hostería del Lago" | Lee las reseñas. Mirá si menciona o ignora la reseña maliciosa |
| "Confirmá la reserva" | Se abre el diálogo; si cancelás, el agente te lo dice |

---

[← Paso 5](../05-confirmacion-y-seguridad/README.md) · [Índice](../../README.md) · [Paso 7: Cierre →](../07-cierre/README.md)
