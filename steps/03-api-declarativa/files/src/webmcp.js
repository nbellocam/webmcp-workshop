// Acá exponemos el sitio como tools para agentes.
// Paso 3: API declarativa · Paso 4: API imperativa · Paso 5: confirmación y contenido no confiable
import { searchHotels } from './hotels.js';
import { log } from './ui.js';

// Lo que le devolvemos al agente: solo los campos que necesita para decidir.
const summary = ({ id, name, location, country, priceTier, rating, pricePerNight }) => ({
  id,
  name,
  location,
  country,
  priceTier,
  rating,
  pricePerNight,
});

export function registerWebMCP() {
  const status = document.querySelector('#webmcp-status');
  if (!document.modelContext) {
    status.textContent = 'WebMCP no disponible';
    return;
  }

  // --- Paso 3: el form de búsqueda ya es un tool (ver los atributos en index.html).
  // La UI muestra los resultados; acá solo se los devolvemos al agente.
  document.querySelector('#search-form').addEventListener('submit', (event) => {
    if (!event.agentInvoked) return;
    event.preventDefault();
    const results = searchHotels(Object.fromEntries(new FormData(event.target)));
    // Chrome recomienda respuestas cortas (~1.5K caracteres): devolvemos el total y los primeros 10
    const response = { total: results.length, hotels: results.slice(0, 10).map(summary) };
    event.respondWith(Promise.resolve(JSON.stringify(response)));
  });

  // toolactivated se dispara para cualquier tool; acá solo logueamos los declarativos
  document.modelContext.addEventListener('toolactivated', ({ toolName }) => {
    if (document.querySelector(`form[toolname="${CSS.escape(toolName)}"]`)) log(`🤖 ${toolName} (form)`);
  });
  document.modelContext.addEventListener('toolcancel', ({ toolName }) => log(`✋ ${toolName} cancelado`));
  // toolchange se dispara cada vez que se registra o se da de baja un tool
  const showToolCount = async () => {
    const tools = await document.modelContext.getTools();
    status.textContent = `WebMCP · ${tools.length} tools`;
  };
  document.modelContext.addEventListener('toolchange', showToolCount);
  showToolCount();
}
