// Acá vamos a exponer el sitio como tools para agentes.
// Paso 3: API declarativa · Paso 4: API imperativa · Paso 5: confirmación y contenido no confiable

export function registerWebMCP() {
  const status = document.querySelector('#webmcp-status');
  status.textContent = document.modelContext ? 'WebMCP disponible' : 'WebMCP no disponible';
}
