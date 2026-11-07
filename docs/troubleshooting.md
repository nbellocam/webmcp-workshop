# Troubleshooting

Lo que se rompió preparando el workshop, con la causa y cómo resolverlo.

> Los que seguro te vas a cruzar: [T2](#t2-el-inspector-no-muestra-los-tools-o-muestra-una-lista-vieja) (el Inspector no refresca solo) y, si tu Chrome es de la empresa, [T8](#t8-chrome-administrado-por-la-empresa).

| # | Síntoma | Aparece en |
|---|---|---|
| [T1](#t1-el-badge-dice-webmcp-no-disponible) | El badge dice "WebMCP no disponible" | Paso 2 |
| [T2](#t2-el-inspector-no-muestra-los-tools-o-muestra-una-lista-vieja) | El Inspector no muestra los tools o muestra una lista vieja | Pasos 2-6 |
| [T3](#t3-el-agente-no-entiende-por-qué-falló-un-tool) | El agente no entiende por qué falló un tool | Paso 4 |
| [T4](#t4-registertool-rechaza-con-invalidstateerror) | `registerTool` rechaza con `InvalidStateError` | Paso 4 |
| [T5](#t5-el-asistente-dice-que-falta-vite_gemini_api_key) | El asistente dice que falta `VITE_GEMINI_API_KEY` | Paso 6 |
| [T6](#t6-claude-code-no-ve-los-tools-de-la-pestaña) | Claude Code no ve los tools de la pestaña | Paso 6 |
| [T7](#t7-tool-execution-cancelled-by-a-form-reset) | `Tool execution cancelled by a form reset` | Pasos 1 y 3 |
| [T8](#t8-chrome-administrado-por-la-empresa) | No podés tocar `chrome://flags` o actualizar Chrome | Paso 2 |
| [T9](#t9-port-5173-is-already-in-use) | `Port 5173 is already in use` | Paso 2 |
| [T10](#t10-el-asistente-responde-con-un-error-de-gemini) | El asistente responde con un error de Gemini | Paso 6 |
| [T11](#t11-la-página-queda-en-blanco-y-hay-un-504-outdated-optimize-dep) | La página queda en blanco y hay un `504 (Outdated Optimize Dep)` | Paso 6 |

## T1: el badge dice "WebMCP no disponible"

**Paso**: 2 en adelante.

**Causa**: `document.modelContext` no existe en ese browser o en esa página. Las razones más comunes:

- Chrome es anterior a la 155 (`chrome://version`).
- El flag no está habilitado, o lo habilitaste y no reiniciaste Chrome.
- La página no es un contexto seguro. `http://localhost` lo es; `http://192.168.x.x` no.

**Solución**: habilitá `chrome://flags/#enable-webmcp-testing` y reiniciá Chrome. Si sigue sin aparecer, habilitá también `chrome://flags/#enable-experimental-web-platform-features`: algunas fuentes todavía nombran ese flag.

Si no podés usar Chrome (o estás en Firefox o Safari), podés seguir con el polyfill de MCP-B. Agregalo en el `<head>` de `app/index.html`, antes de `main.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/@mcp-b/webmcp-polyfill@6.0.3/dist/index.iife.js"></script>
```

Implementa la API imperativa y la declarativa. El Inspector no funciona con el polyfill, así que las tablas de "Probalo en vivo" se hacen desde la consola de DevTools:

```javascript
const tools = await document.modelContext.getTools();
await document.modelContext.executeTool(tools.find((t) => t.name === 'search-hotels'), { location: 'Bariloche' });
```

## T2: el Inspector no muestra los tools o muestra una lista vieja

**Paso**: 2 en adelante.

**Causa**: el Inspector lee los tools de la pestaña activa al abrirse. Si se registran o se dan de baja tools con el panel abierto, o recargás la página, puede quedar mostrando una lista vieja. También pide el mismo flag del [T1](#t1-el-badge-dice-webmcp-no-disponible).

**Solución**: cerrá y volvé a abrir el panel. Como referencia, el badge de la página siempre muestra la cantidad real (`WebMCP · N tools`).

## T3: el agente no entiende por qué falló un tool

**Paso**: 4.

**Síntoma**: el agente reintenta con los mismos argumentos, o dice que hubo "un error" sin más detalle.

**Causa**: el `execute` tiró una excepción. En ese caso, quien llamó al tool recibe un error genérico (`OperationError` según el spec, `UnknownError: Tool was executed but the invocation failed` en Chrome 157) y el mensaje se pierde.

**Solución**: devolvé el error como resultado (`return 'Error: ...'`) en lugar de tirarlo. El helper `tool()` de `webmcp.js` lo hace para todos los tools.

## T4: `registerTool` rechaza con `InvalidStateError`

**Paso**: 4.

**Causa**: ya hay un tool registrado con ese nombre, o el nombre tiene caracteres inválidos (solo se permiten letras, números, `_`, `-` y `.`, hasta 128 caracteres). En una SPA pasa cuando el código de registro corre dos veces sin dar de baja lo anterior; en React, el doble montaje de *strict mode* produce exactamente este error.

**Solución**: registrá con un `signal` y abortalo cuando el componente o la vista se desmonta. En este workshop, si lo ves, recargá la página completa.

## T5: el asistente dice que falta `VITE_GEMINI_API_KEY`

**Paso**: 6.

**Causa**: Vite lee las variables de entorno del directorio de la app, no de la raíz del repo, y solo al arrancar. El archivo tiene que estar en `app/.env.local` (o en `solucion/.env.local`), y Vite solo expone al browser las variables con prefijo `VITE_`.

**Solución**:

```bash
cp app/.env.example app/.env.local
# completá VITE_GEMINI_API_KEY y reiniciá npm run dev
```

## T6: Claude Code no ve los tools de la pestaña

**Paso**: 6.

**Causa**: el relay solo ve las pestañas que cargaron el script `embed.js` mientras el relay estaba corriendo, y solo mientras siguen abiertas. Si usaste `--widget-origin`, además el origen de la página tiene que estar en la lista.

**Solución**:

1. Verificá que el server está conectado con `claude mcp list`.
2. Recargá la pestaña de Rumbo Sur.
3. Pedile a Claude que llame a `webmcp_list_sources`: tiene que aparecer la pestaña.
4. Si el origen es otro (por ejemplo, otro puerto), sumalo a `--widget-origin`.

Si el puerto `9333` está ocupado, el relay acepta `--port` y el script, `data-relay-port`; tienen que coincidir.

## T7: `Tool execution cancelled by a form reset`

**Paso**: 1 y 3.

**Causa**: el handler de `submit` llama a `form.reset()` cuando el form lo envió un agente. Chrome lo toma como una cancelación (dispara `toolcancel`) y descarta la respuesta, aunque `respondWith()` se haya llamado antes. Con el polyfill de MCP-B no pasa, así que es fácil no verlo hasta probar en Chrome.

**Solución**: limpiá el form solo cuando lo envió una persona:

```javascript
if (e.agentInvoked) {
  e.respondWith(Promise.resolve('...'));
} else {
  form.reset();
}
```

## T8: Chrome administrado por la empresa

**Paso**: 2.

**Síntoma**: no podés actualizar Chrome, `chrome://flags` aparece bloqueado, o no te deja instalar extensiones.

**Causa**: las políticas de la organización. Las ves en `chrome://policy`.

**Solución**: instalá un Chrome aparte que no esté administrado, como [Chrome Dev o Canary](https://www.google.com/chrome/dev/) o [Chrome for Testing](https://developer.chrome.com/blog/chrome-for-testing), y hacé el workshop ahí. Si tampoco podés, seguí con el polyfill del [T1](#t1-el-badge-dice-webmcp-no-disponible).

## T9: `Port 5173 is already in use`

**Paso**: 2.

**Causa**: cada script usa un puerto fijo (`dev` el 5173, `apertura` el 5174, `solucion` el 5175) y falla si ya está ocupado, en lugar de moverse a otro y dejarte abriendo la app equivocada. Lo más común es tener el mismo script corriendo en otra terminal.

**Solución**: cortá el otro proceso con `Ctrl+C`, o buscá quién usa el puerto con `lsof -i :5173`.

## T10: el asistente responde con un error de Gemini

**Paso**: 6.

**Causa**: lo más común es un `429` (te quedaste sin cuota del free tier) o un modelo que no está disponible para tu key o tu región.

**Solución**: esperá un minuto en el caso del `429`. Para cambiar de modelo, agregá `VITE_GEMINI_MODEL` en `app/.env.local` (por ejemplo, `gemini-3.6-flash`) y reiniciá `npm run dev`.

## T11: la página queda en blanco y hay un `504 (Outdated Optimize Dep)`

**Paso**: 6.

**Causa**: Vite pre-empaqueta las dependencias (`@google/genai`) y las guarda en `node_modules/.vite`. Si corrés `npm install` con el server levantado, el cache queda viejo y Vite devuelve `504` para esa dependencia, así que `main.js` nunca termina de cargar.

**Solución**: cortá el server, borrá el cache y levantalo de nuevo:

```bash
rm -rf node_modules/.vite
npm run dev
```
