# Paso 2 — Setup

> Paso 2 de 7 · [Índice del workshop](../../README.md)

Tres cosas: un Chrome con WebMCP habilitado, una forma de ver los tools que expone la página y el sitio base corriendo. Si das el workshop en grupo, este paso conviene mandarlo como tarea previa.

## 2.1 Habilitar WebMCP en Chrome

Necesitás **Chrome 155 o superior** (chequealo en `chrome://version`); yo lo probé en la 157. WebMCP está en origin trial (hasta Chrome 162), así que para desarrollo local se habilita con un flag:

1. Abrí `chrome://flags/#enable-webmcp-testing`.
2. Poné **WebMCP for testing** en `Enabled`.
3. Reiniciá Chrome.

Para verificar, abrí DevTools en cualquier pestaña de `localhost` y corré:

```javascript
'modelContext' in document
```

```
true
```

> Si da `false`, mirá [T1](../../docs/troubleshooting.md#t1-el-badge-dice-webmcp-no-disponible). Si no podés tocar los flags porque Chrome lo administra tu empresa, [T8](../../docs/troubleshooting.md#t8-chrome-administrado-por-la-empresa).

## 2.2 Instalar el Model Context Tool Inspector

Es una extensión del equipo de Chrome que lista los tools de la página actual, muestra el schema de cada uno y te deja ejecutarlos a mano. Es lo más parecido a un Postman de WebMCP.

Instalala desde la [Chrome Web Store](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) y fijala en la barra.

El Inspector también tiene un modo chat con Gemini, que usamos en el paso 6. Para eso pide una API key; para listar y ejecutar tools no hace falta.

## 2.3 Levantar el sitio base

Si todavía tenés corriendo la apertura no pasa nada: cada script usa su propio puerto. Desde la raíz del repo:

```bash
npm install
npm run dev
```

```
  VITE v8.3.6  ready in 180 ms

  ➜  Local:   http://localhost:5173/
```

Abrí `http://localhost:5173`. Es **Rumbo Sur**, un sitio de reservas con un buscador, la lista de resultados, el detalle de cada hotel y la reserva a la derecha. Abajo hay un panel de "Actividad del agente" que por ahora está vacío.

El badge de arriba a la derecha debería decir **WebMCP disponible**. Si abrís el Inspector, la lista de tools está vacía: todavía no registramos nada.

> `localhost` cuenta como contexto seguro, que es requisito de la API. Si lo abrís desde otra máquina por IP, `document.modelContext` no va a existir.

## 2.4 Recorrido rápido por el código

Antes de tocar nada, mirá cómo está dividido `app/src/`:

| Archivo | Qué tiene |
|---|---|
| `data.js` | Los 32 hoteles con precio, rating y algunas reseñas |
| `hotels.js` | La capa de servicio: `searchHotels`, `getHotel`, `addToBooking`, `confirmBooking`… |
| `ui.js` | Render y event listeners. No sabe nada de WebMCP |
| `webmcp.js` | Casi vacío. Acá va todo lo del workshop |

Esta separación es la decisión más importante del ejemplo: los tools no implementan lógica, llaman a las mismas funciones que llaman los botones. Si mañana cambia cómo se calcula el total de una reserva, cambia para el usuario y para el agente al mismo tiempo.

---

[← Paso 1](../01-apertura/README.md) · [Índice](../../README.md) · [Paso 3: API declarativa →](../03-api-declarativa/README.md)
