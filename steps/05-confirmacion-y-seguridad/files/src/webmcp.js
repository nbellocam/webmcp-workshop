// Acá exponemos el sitio como tools para agentes.
// Paso 3: API declarativa · Paso 4: API imperativa · Paso 5: confirmación y contenido no confiable
import { searchHotels, getHotel, getBooking, addToBooking, removeFromBooking, confirmBooking, onBookingChange } from './hotels.js';
import { renderDetail, askForConfirmation, log } from './ui.js';

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

// Si un tool tira una excepción, el agente recibe un error genérico y no se entera del motivo.
// Por eso devolvemos el mensaje como resultado: así el modelo puede corregirse y reintentar.
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

// --- Paso 4: tools imperativos ------------------------------------------------

// Paso 5: este tool devuelve reseñas escritas por usuarios -> untrustedContentHint.
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
  annotations: { readOnlyHint: true, untrustedContentHint: true },
  async execute({ hotelId }) {
    const hotel = getHotel(hotelId);
    if (!hotel) return `Error: there is no hotel with id ${hotelId}. Use search-hotels to find valid ids.`;
    renderDetail(hotel.id); // la UI siempre refleja lo que hizo el agente
    return { ...summary(hotel), userReviews: hotel.reviews };
  },
});

const addToBookingTool = tool({
  name: 'add-to-booking',
  description:
    'Add a stay at a hotel to the current booking. The booking is not confirmed until the user approves it.',
  inputSchema: {
    type: 'object',
    properties: {
      hotelId: { type: 'integer', description: 'Hotel id, as returned by search-hotels.' },
      checkIn: { type: 'string', format: 'date', description: 'Check-in date in YYYY-MM-DD format.' },
      nights: { type: 'integer', minimum: 1, maximum: 14, description: 'Number of nights, between 1 and 14.' },
    },
    required: ['hotelId', 'checkIn', 'nights'],
  },
  async execute(input) {
    const item = addToBooking(input);
    return `Added ${item.nights} night(s) at ${item.hotel} from ${item.checkIn}. Subtotal: US$ ${item.total}.`;
  },
});

const getBookingTool = tool({
  name: 'get-booking',
  description: 'Get the stays in the current booking, the total price and whether it is confirmed.',
  inputSchema: { type: 'object', properties: {} },
  annotations: { readOnlyHint: true },
  async execute() {
    return getBooking();
  },
});

// Estos dos solo tienen sentido cuando hay algo en la reserva.
const removeFromBookingTool = tool({
  name: 'remove-from-booking',
  description: 'Remove a hotel from the current booking.',
  inputSchema: {
    type: 'object',
    properties: { hotelId: { type: 'integer', description: 'Hotel id of the stay to remove.' } },
    required: ['hotelId'],
  },
  async execute({ hotelId }) {
    removeFromBooking(hotelId);
    return `Removed hotel ${hotelId} from the booking.`;
  },
});

// --- Paso 5: confirmación del usuario ------------------------------------------

const confirmBookingTool = tool({
  name: 'confirm-booking',
  description:
    'Ask the user to confirm and pay the current booking. The user sees a summary and decides; ' +
    'call this only when the user said they want to book.',
  inputSchema: { type: 'object', properties: {} },
  annotations: { consequentialHint: true },
  async execute(input, { signal }) {
    const shown = getBooking();
    const approved = await askForConfirmation(shown, { signal });
    if (!approved) return 'The user did not confirm. Nothing was booked.';

    // Si la reserva cambió mientras el diálogo estaba abierto, no confirmamos algo que el usuario no vio
    if (JSON.stringify(getBooking()) !== JSON.stringify(shown)) {
      return 'The booking changed while the user was confirming. Nothing was booked; show the new booking and ask again.';
    }
    const { code, total } = confirmBooking();
    return `Booking confirmed. Code ${code}, total US$ ${total}.`;
  },
});

// -------------------------------------------------------------------------------

// registerTool devuelve una promesa que rechaza si el nombre está repetido o el schema es inválido
function register(definition, options) {
  document.modelContext.registerTool(definition, options).catch((error) => log(`⚠️ ${definition.name}: ${error.message}`));
}

let bookingTools = null; // AbortController de los tools que dependen del estado

function syncBookingTools(booking) {
  const active = booking.items.length > 0 && !booking.confirmed;

  if (active && !bookingTools) {
    bookingTools = new AbortController();
    const { signal } = bookingTools;
    register(removeFromBookingTool, { signal });
    register(confirmBookingTool, { signal });
  }

  if (!active && bookingTools) {
    bookingTools.abort(); // abort() da de baja todos los tools registrados con ese signal
    bookingTools = null;
  }
}

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

  // --- Paso 4: tools imperativos
  register(getHotelDetails);
  register(addToBookingTool);
  register(getBookingTool);

  // Tools dinámicos: aparecen y desaparecen según la reserva
  onBookingChange(syncBookingTools);
}
