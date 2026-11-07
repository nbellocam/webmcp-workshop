# Paso 1 — Apertura: una app de tareas en tres actos

> Paso 1 de 7 · [Índice del workshop](../../README.md)

Antes de meternos con el sitio de hoteles, vamos a resolver el mismo problema tres veces sobre una app mínima de tareas. Es la forma más corta que encontré de mostrar qué resuelve WebMCP y cuánto código lleva.

> Este paso está pensado para que lo muestre quien presenta, en vivo. Para probarlo vos necesitás el flag y el Inspector del [Paso 2](../02-setup/README.md); si estás haciendo el workshop por tu cuenta, hacé primero el paso 2 y volvé.

```bash
npm install
npm run apertura
```

Abrí `http://localhost:5174`. El archivo es [`apertura/index.html`](../../apertura/index.html): un form, una lista y un botón. Sin dependencias.

## Acto 1: el agente a ciegas

Pedile a un agente de browser algo como _"agregá 'comprar café' y borrá las tareas completadas"_. Hoy tiene dos caminos:

- **Screenshots**: mira la pantalla, adivina dónde está el input, hace click y escribe. Gasta muchos tokens y se rompe cuando cambia el diseño.
- **DOM**: lee el HTML y trata de deducir qué hace cada botón. Funciona hasta que el botón es un `<div class="btn-3">`.

En los dos casos el agente adivina la intención a partir de la UI. El sitio sabe exactamente qué acciones tiene, pero no tiene forma de decirlo. Si abrís el Inspector, la lista de tools está vacía.

## Acto 2: el form ya es un tool

El form de "Agregar" ya describe una acción con un parámetro. Le agregamos cuatro atributos:

```html
<form
  id="add-form"
  toolname="add-todo"
  tooldescription="Add a new item to the to-do list."
  toolautosubmit
>
  <input
    type="text"
    name="text"
    placeholder="¿Qué hay que hacer?"
    toolparamdescription="Text of the to-do item."
    required
  />
  <button>Agregar</button>
</form>
```

Y en el handler de `submit`, si lo envió un agente, le devolvemos el resultado:

```javascript
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = new FormData(form).get('text');
  addTodo(text);
  if (e.agentInvoked) {
    e.respondWith(Promise.resolve(`Added "${text}". There are ${todos.length} items.`));
  } else {
    form.reset();
  }
});
```

El `reset()` va solo en la rama del usuario por un motivo que vemos en el paso 3.

Recargá: el Inspector ahora muestra `add-todo`, con un `inputSchema` que el browser armó solo a partir del `name`, el `required` y el `toolparamdescription` del input.

## Acto 3: tools en JavaScript

"Borrar completadas" es un botón, no un form. Para eso está la API imperativa:

```javascript
if (document.modelContext) {
  document.modelContext.registerTool({
    name: 'list-todos',
    description: 'List the to-do items and whether each one is done.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    execute: async () => todos,
  });

  document.modelContext.registerTool({
    name: 'clear-completed',
    description: 'Delete every to-do item that is marked as done.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { consequentialHint: true },
    async execute() {
      if (!confirm('Un agente quiere borrar las tareas completadas. ¿Dale?')) {
        return 'The user did not allow it. Nothing was deleted.';
      }
      return `Deleted ${clearCompleted()} item(s).`;
    },
  });
}
```

Lo que se repite en el resto del workshop:

- `execute` llama a `clearCompleted()`, la misma función que usa el botón. No hay lógica duplicada.
- Las `annotations` le dicen al agente qué tipo de tool es: uno solo lee y el otro tiene consecuencias.
- Antes de borrar, le preguntamos al usuario.

Para pasar al final de la apertura, copiá el archivo con los tres actos:

```bash
cp steps/01-apertura/files/index.html apertura/
```

## Probalo en vivo

Desde el chat del Inspector (necesita la API key de Gemini) o ejecutando los tools a mano:

| Pedido al agente | Qué muestra |
|---|---|
| "Agregá 'comprar café'" | El form se completa solo y se envía (`toolautosubmit`) |
| "¿Qué tengo pendiente?" | Usa `list-todos`, sin tocar la UI |
| "Borrá las completadas" | Aparece el `confirm()`; si cancelás, el agente se entera |

---

[Índice](../../README.md) · [Paso 2: Setup →](../02-setup/README.md)
