# Paso 7 — Cierre

> Paso 7 de 7 · [Índice del workshop](../../README.md)

## Qué construiste

Un sitio de reservas que un agente puede usar sin scrapear el DOM, sin tocar el backend. Y los mismos tools los consumiste desde una extensión, desde un agente dentro de la página y desde un cliente MCP de escritorio.

## Lo que me llevo

Si me tengo que quedar con algo: los tools llaman a la misma capa de servicio que los botones, la descripción es lo único que lee el modelo para decidir, y lo que tiene consecuencias lo confirma el sitio con su propia UI.

Algunas cosas más chicas que aparecieron en el camino:

- Si un tool tira una excepción, el agente recibe un error genérico. Devolvé el mensaje como resultado y el modelo tiene con qué corregirse.
- Registrá al cargar lo que siempre aplica y dinámicamente lo que depende del estado. Cada tool ocupa contexto.
- Cuando un tool hace algo, la UI tiene que mostrarlo con los mismos componentes de siempre.
- No resetees un form cuando lo envió un agente.

## Lo que cambió en la API durante 2026

Si leíste algo sobre WebMCP a principios de año, esto es lo que hay que actualizar:

| Antes | Ahora |
|---|---|
| `navigator.modelContext` | `document.modelContext` |
| `provideContext({ tools })` y `clearContext()` | No existen. `registerTool()` uno por uno |
| `unregisterTool(name)` | `registerTool(tool, { signal })` + `controller.abort()` |
| `execute(input, agent)` con `agent.requestUserInteraction()` | `execute(input, { signal })`. La confirmación va en tu UI ([issue #165](https://github.com/webmachinelearning/webmcp/issues/165) para volver a sumarlo) |
| Annotations: `readOnlyHint`, `untrustedContentHint` | Se suman `consequentialHint` y `debugging` (Chrome 156) |
| Solo registrar | `getTools()` y `executeTool()` para consumir desde la página |
| `executeTool(tool, '{"json": "string"}')` | `executeTool(tool, { objeto })`. Deprecado desde Chrome 155; en mis pruebas con la 157 ya tira `TypeError` |
| `window.ontoolactivated` | Eventos sobre `document.modelContext` (lo de `window` dejó de andar en Chrome 156) |

La API declarativa sigue como propuesta separada del spec principal, y Chrome implementa una versión parcial. Es la parte que más puede cambiar.

## Estado del estándar

- **Spec**: Draft Community Group Report del W3C Web Machine Learning CG. No es un estándar todavía.
- **Chrome**: origin trial extendido hasta Chrome 162; flag `#enable-webmcp-testing` para desarrollo local.
- **Edge**: origin trial propio desde Edge 150.
- **Firefox**: posición [neutral](https://github.com/mozilla/standards-positions/issues/1412), sin implementación.
- **Safari**: WebKit tomó [posición en contra](https://github.com/WebKit/standards-positions/issues/670), con preocupaciones de seguridad, privacidad y consentimiento.
- Para probar en browsers sin soporte está el polyfill de MCP-B.

## Por dónde seguir

- **Evals**: el [WebMCP Evals CLI](https://github.com/GoogleChromeLabs/webmcp-tools) corre casos tipo _"quiero un hotel en Bariloche para dos noches"_ y verifica que el modelo llame a los tools correctos con los argumentos correctos. Es lo más parecido a tests unitarios para las descripciones.
- **`title` y `outputSchema`**: el spec acepta un título legible y un schema para la salida, que no usamos acá.
- **Iframes y otros orígenes**: `allow="tools"` y `exposedTo` para widgets embebidos.
- **Combinar con MCP**: MCP para la lógica pesada del backend y WebMCP para lo que pasa en la pestaña.

## Referencias

- [Spec de WebMCP](https://webmachinelearning.github.io/webmcp/) · [explainers](https://github.com/webmachinelearning/webmcp) · [estado de implementación](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md)
- [WebMCP en Chrome](https://developer.chrome.com/docs/ai/webmcp) · [best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices) · [secure tools](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
- [GoogleChromeLabs/webmcp-tools](https://github.com/GoogleChromeLabs/webmcp-tools)
- [Model Context Tool Inspector](https://github.com/beaufortfrancois/model-context-tool-inspector)
- [MCP-B](https://github.com/WebMCP-org/npm-packages)

## Gracias

Si hiciste el workshop y algo no funcionó como está escrito, abrí un issue. Con una API que cambia cada pocas versiones de Chrome, la única forma de que esto siga sirviendo es mantenerlo al día. Lo que ya se rompió está en [docs/troubleshooting.md](../../docs/troubleshooting.md).

---

[← Paso 6](../06-consumidores/README.md) · [Índice](../../README.md)
