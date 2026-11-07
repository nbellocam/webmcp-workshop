# WebMCP: tu sitio como un set de tools

Workshop práctico de WebMCP: tomamos un sitio de reservas de hoteles que no sabe nada de agentes y lo convertimos en un sitio que un agente puede usar **sin scrapear el DOM ni simular clicks**. Sin MCP server aparte, sin backend nuevo: la pestaña abierta es el server.

El foco está en la API. El sitio es HTML, CSS y JavaScript plano con Vite como dev server; no hay framework ni build raro de por medio.

## Qué vas a construir

| Pieza | Rol |
|---|---|
| **Una app de tareas** | La apertura: el mismo caso en tres actos (sin tools, declarativo, imperativo) |
| **Rumbo Sur** | Un sitio de reservas con 32 hoteles ficticios en las mismas ciudades de Argentina, Uruguay y Chile del [workshop de MCP Toolbox](https://github.com/nbellocam/travel-agent) |
| **API declarativa** | El form de búsqueda que ya existe pasa a ser un tool con cuatro atributos |
| **API imperativa** | Tools en JavaScript para ver detalles y armar la reserva, que aparecen y desaparecen según el estado |
| **Confirmación y seguridad** | `consequentialHint`, un diálogo propio para confirmar y una reseña con *prompt injection* |
| **Tres consumidores** | El Model Context Tool Inspector, un agente propio dentro de la página y Claude Code (o cualquier cliente MCP) vía MCP-B |

## Requisitos

- **Chrome 155 o superior** con el flag `chrome://flags/#enable-webmcp-testing` habilitado. Lo probé en Chrome 157. Si tu Chrome lo administra tu empresa, mirá [T8](docs/troubleshooting.md#t8-chrome-administrado-por-la-empresa).
- **Node.js 20+**.
- El [Model Context Tool Inspector](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) instalado.
- Una [API key de Gemini](https://aistudio.google.com/apikey) para el paso 6 (el chat del Inspector y el asistente embebido). Si el workshop es presencial, alcanza con que la tenga quien presenta.
- Opcional, para el paso 6.3: [Claude Code](https://claude.com/claude-code), Claude Desktop o Cursor.

> Si lo das para un grupo, mandá el [Paso 2](steps/02-setup/README.md) como tarea previa. Actualizar Chrome, prender el flag e instalar la extensión no entra en cinco minutos con una sala llena.

## Los pasos

| # | Paso | Qué hacés | 45' | 30' |
|---|---|---|---|---|
| 1 | [Apertura](steps/01-apertura/README.md) | Una app de tareas en tres actos: el agente a ciegas, un form con atributos y dos tools en JS | 5' | 3' (demo) |
| 2 | [Setup](steps/02-setup/README.md) | Flag, Inspector y el sitio base corriendo | 5' | previo |
| 3 | [API declarativa](steps/03-api-declarativa/README.md) | El form de búsqueda como tool | 7' | 5' |
| 4 | [API imperativa](steps/04-api-imperativa/README.md) | `registerTool`, annotations y tools dinámicos con `AbortController` | 10' | 8' |
| 5 | [Confirmación y seguridad](steps/05-confirmacion-y-seguridad/README.md) | `consequentialHint`, diálogo propio y `untrustedContentHint` | 7' | 6' |
| 6 | [Consumidores](steps/06-consumidores/README.md) | Inspector, agente propio con `getTools`/`executeTool` y MCP-B | 8' | 5' (solo Inspector) |
| 7 | [Cierre](steps/07-cierre/README.md) | Qué te llevás, estado del estándar y por dónde seguir | 3' | 2' |

➡️ **Empezá por el [Paso 1](steps/01-apertura/README.md).**

## Cómo está armado el repo

```
.
├── apertura/index.html     la app de tareas, en su estado inicial (sin WebMCP)
├── app/                    el sitio de hoteles, punto de partida: acá trabajás
│   ├── index.html
│   └── src/
│       ├── data.js         los 32 hoteles (todo inventado)
│       ├── hotels.js       la capa de servicio: búsqueda y reserva
│       ├── ui.js           todo lo visual, sin nada de WebMCP
│       ├── webmcp.js       ← lo que vamos a ir completando
│       └── main.js
├── solucion/               el sitio terminado, por si te perdés o para presentar
├── steps/NN-.../README.md  un paso por carpeta
├── steps/NN-.../files/     los archivos de ese paso listos para copiar
└── docs/
    ├── troubleshooting.md
    └── preguntas-frecuentes.md
```

```bash
npm install
npm run apertura   # la app de tareas, en http://localhost:5174
npm run dev        # el sitio de hoteles (app/), en http://localhost:5173
npm run solucion   # el sitio terminado, en http://localhost:5175
```

Cada script tiene su puerto fijo, así podés tener los tres levantados a la vez.

**Si te atrasás**, copiá los archivos de los pasos sobre `app/`, en orden, hasta el paso en el que estás. Por ejemplo, para quedar al final del paso 4:

```bash
cp -R steps/03-api-declarativa/files/. app/
cp -R steps/04-api-imperativa/files/. app/
```

Los archivos del paso 1 son de la apertura, no de `app/`.

## Si algo falla

Lo que se rompió preparando el workshop está en **[docs/troubleshooting.md](docs/troubleshooting.md)**, con causa y solución. Los más comunes:

| Síntoma | Dónde |
|---|---|
| El badge dice "WebMCP no disponible" | [T1](docs/troubleshooting.md#t1-el-badge-dice-webmcp-no-disponible) |
| El Inspector no muestra los tools o muestra una lista vieja | [T2](docs/troubleshooting.md#t2-el-inspector-no-muestra-los-tools-o-muestra-una-lista-vieja) |
| `Tool execution cancelled by a form reset` | [T7](docs/troubleshooting.md#t7-tool-execution-cancelled-by-a-form-reset) |
| No podés tocar `chrome://flags` o actualizar Chrome | [T8](docs/troubleshooting.md#t8-chrome-administrado-por-la-empresa) |
| `Port 5173 is already in use` | [T9](docs/troubleshooting.md#t9-port-5173-is-already-in-use) |

## Preguntas frecuentes

WebMCP vs MCP, seguridad, por qué las descripciones están en inglés y qué pasa en Firefox o Safari: **[docs/preguntas-frecuentes.md](docs/preguntas-frecuentes.md)**.

## Versiones verificadas

Verificadas el **7 de noviembre de 2026**. WebMCP cambia seguido; si hacés el workshop mucho después, chequealas.

| Componente | Versión |
|---|---|
| Spec WebMCP | Draft Community Group Report del 2 de noviembre de 2026 |
| Chrome | 155+ (probado en 157). Origin trial extendido hasta Chrome 162 |
| Model Context Tool Inspector | 1.9.20 |
| `@google/genai` | 3.0.0 · modelo `gemini-3.8-flash` |
| `@mcp-b/webmcp-local-relay` | 6.0.3 |
| Vite | 8.3.6 |

> ⚠️ Si venís de material de principios de 2026: la API ahora vive en `document.modelContext` (no en `navigator`), `provideContext()`, `clearContext()` y `unregisterTool()` ya no existen, y `requestUserInteraction()` no está en el spec actual. En el [Paso 7](steps/07-cierre/README.md) está la lista completa de cambios.

## Sobre los datos de ejemplo

Los hoteles, precios, ratings y reseñas son **inventados**. Las ciudades son las mismas del workshop de MCP Toolbox, pero los nombres no corresponden a ningún establecimiento real; si alguno coincide, es casualidad.

## Licencia

[MIT](LICENSE).

## Referencias

- [Spec de WebMCP](https://webmachinelearning.github.io/webmcp/) · [repo y explainers](https://github.com/webmachinelearning/webmcp)
- [Documentación de WebMCP en Chrome](https://developer.chrome.com/docs/ai/webmcp)
- [GoogleChromeLabs/webmcp-tools](https://github.com/GoogleChromeLabs/webmcp-tools): demos, Evals CLI y el Inspector
- [MCP-B](https://github.com/WebMCP-org/npm-packages): polyfill y relay a clientes MCP
- [WebMCP: convirtiendo tu sitio en una herramienta para agentes](https://nbellocam.dev/blog/webmcp), el post donde arranqué con el tema
