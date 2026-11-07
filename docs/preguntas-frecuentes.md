# Preguntas frecuentes

## Conceptos

**¿WebMCP reemplaza a MCP?**
No. MCP es un protocolo cliente-servidor que corre en cualquier lado y no depende de un browser. WebMCP es una API del browser que vive mientras la pestaña está abierta y reutiliza la sesión, las cookies y la UI del usuario. Lo razonable es usar los dos: MCP para lo que es servicio y WebMCP para lo que pasa en la pestaña.

**¿Por qué no alcanza con que el agente lea el DOM?**
A veces alcanza, pero es frágil. El agente adivina la intención a partir de la UI, gasta tokens en screenshots y se rompe cuando cambia el diseño. Con WebMCP el sitio declara qué acciones existen y qué parámetros llevan.

**¿Declarativa o imperativa?**
Si ya tenés un `<form>` que hace lo que querés exponer, la declarativa: son atributos. Para todo lo demás, la imperativa. En este workshop se usan las dos sobre el mismo sitio, y probablemente así sea en la mayoría de los casos reales.

**¿El agente ve todo lo que hay en la página?**
Ve los tools que registraste y lo que esos tools devuelven. Si además tiene acceso al DOM o a screenshots depende del agente, no de WebMCP.

## Diseño de tools

**¿Por qué las descripciones y los errores están en inglés si el sitio está en español?**
Porque los lee el modelo, y es lo que usan los ejemplos oficiales. No es una regla: si tu público y tu agente trabajan en español, escribilos en español y medilo con evals. Lo que sí conviene es no mezclar: todo lo que le llega al modelo, en el mismo idioma.

**¿Cuántos tools son demasiados?**
No hay un número, pero cada tool ocupa contexto y suma una opción más para elegir mal. Si dos tools se pisan, el modelo no sabe cuál usar. Registrá dinámicamente los que dependen del estado.

**¿Qué devuelvo: un string, un objeto, el formato `content` de MCP?**
Cualquier valor serializable a JSON. Para datos, un objeto. Para confirmar una acción, un string corto que diga qué pasó y cómo quedó el estado. La [guía de Chrome](https://developer.chrome.com/docs/ai/webmcp/secure-tools) sugiere mantener la salida debajo de 1.500 caracteres.

## Seguridad

**¿`consequentialHint` hace que el browser pida confirmación?**
No necesariamente. Es una pista para el agente y el browser. Si la acción importa, la confirmación tiene que estar en tu `execute`.

**¿Cómo evito el *prompt injection*?**
Hoy no hay una forma confiable de evitarlo dentro del modelo. Marcá el contenido de terceros con `untrustedContentHint`, devolvé solo lo necesario y poné detrás de una confirmación del usuario todo lo que tenga consecuencias. El ejemplo de la Hostería del Lago en el paso 5 está para eso.

**¿Otro sitio puede llamar a mis tools?**
No por defecto. Los tools quedan acotados al origen que los registra. Para exponerlos a otros orígenes hay que pasar `exposedTo` al registrar, y los iframes de otro origen necesitan `allow="tools"`.

**¿Es seguro tener la API key de Gemini en el browser como en el paso 6?**
No. Para un workshop en `localhost` sirve. Si la usás en otro lado, restringila por HTTP referrer y ponele un tope de gasto; en producción, la llamada al modelo va detrás de un backend propio. Tené en cuenta que `vite build` con un `.env.local` presente también mete la key en `dist/`.

**¿Y el relay de MCP-B?**
Escucha solo en `127.0.0.1`, pero por defecto acepta tools de cualquier página que tengas abierta. Usá `--widget-origin` con los orígenes del workshop, como en el paso 6.

## Compatibilidad

**¿Funciona en Firefox o Safari?**
No de forma nativa. Mozilla tiene una posición [neutral](https://github.com/mozilla/standards-positions/issues/1412) y WebKit se [opuso](https://github.com/WebKit/standards-positions/issues/670). El polyfill de MCP-B implementa la API y permite seguir el workshop (ver [T1](troubleshooting.md#t1-el-badge-dice-webmcp-no-disponible)).

**¿Puedo usarlo en producción?**
Con el origin trial podés probarlo con usuarios reales en Chrome, pero la API sigue cambiando entre versiones. Hacé feature detection (`if (document.modelContext)`) y pensá el sitio en dos modos: el de siempre, y uno asistido cuando hay un agente.

**¿Y con React, Angular o Vue?**
La API es la misma. Lo que cambia es dónde registrás: en el montaje del componente, con un `AbortController` que abortás al desmontar. MCP-B tiene hooks para React (`@mcp-b/react-webmcp`), y en el repo de GoogleChromeLabs hay demos en React y Angular.

---

Si algo no funciona como está escrito, primero mirá [troubleshooting.md](troubleshooting.md).
