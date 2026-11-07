// Capa de servicio: la usan la UI y (más adelante) los tools de WebMCP.
// La regla del workshop: los tools nunca duplican lógica, llaman a estas funciones.
// Los errores están en inglés porque, además de la UI, los lee el modelo.
import { HOTELS } from './data.js';

export function searchHotels({ location, country, priceTier } = {}) {
  return HOTELS.filter(
    (h) =>
      (!location || h.location === location) &&
      (!country || h.country === country) &&
      (!priceTier || h.priceTier === priceTier),
  );
}

export function getHotel(id) {
  return HOTELS.find((h) => h.id === Number(id));
}

// Fecha local en formato YYYY-MM-DD (toISOString usa UTC y a la noche ya es "mañana")
export function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function isValidDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// --- Reserva -----------------------------------------------------------------

const booking = { items: [], confirmed: false };
const listeners = new Set();

export const bookingTotal = () => booking.items.reduce((sum, i) => sum + i.total, 0);
export const getBooking = () => ({ ...structuredClone(booking), total: bookingTotal() });
export const onBookingChange = (fn) => listeners.add(fn);
const notify = () => listeners.forEach((fn) => fn(getBooking()));

export function addToBooking({ hotelId, checkIn, nights }) {
  const hotel = getHotel(hotelId);
  if (!hotel) throw new Error(`There is no hotel with id ${hotelId}.`);
  if (!isValidDate(checkIn)) throw new Error('checkIn must be a valid date in YYYY-MM-DD format.');
  if (checkIn < today()) throw new Error(`checkIn cannot be in the past. Today is ${today()}.`);
  if (!Number.isInteger(nights) || nights < 1 || nights > 14) {
    throw new Error('nights must be an integer between 1 and 14.');
  }
  if (booking.confirmed) Object.assign(booking, { items: [], confirmed: false });

  // Una estadía por hotel: si ya estaba en la reserva, la reemplazamos
  const item = { hotelId: hotel.id, hotel: hotel.name, checkIn, nights, total: hotel.pricePerNight * nights };
  booking.items = [...booking.items.filter((i) => i.hotelId !== hotel.id), item];
  notify();
  return item;
}

export function removeFromBooking(hotelId) {
  booking.items = booking.items.filter((i) => i.hotelId !== Number(hotelId));
  notify();
}

export function confirmBooking() {
  if (booking.items.length === 0) throw new Error('The booking is empty.');
  booking.confirmed = true;
  notify();
  return { code: `RES-${Date.now().toString(36).toUpperCase()}`, total: bookingTotal() };
}
