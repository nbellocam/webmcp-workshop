// Todo lo visual vive acá. No hay nada de WebMCP en este archivo:
// la idea es que los tools y los clicks del usuario terminen en las mismas funciones.
import {
  searchHotels,
  getHotel,
  getBooking,
  today,
  addToBooking,
  removeFromBooking,
  bookingTotal,
  onBookingChange,
  confirmBooking,
} from './hotels.js';

const $ = (sel) => document.querySelector(sel);
const usd = (n) => `US$ ${n.toLocaleString('es-AR')}`;
const escape = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function renderResults(hotels) {
  $('#detail').hidden = true;
  $('#results').innerHTML = hotels.length
    ? hotels
        .map(
          (h) => `
      <li>
        <div>
          <strong>${escape(h.name)}</strong>
          <small>${h.location}, ${h.country} · ${h.priceTier} · ★ ${h.rating}</small>
        </div>
        <span>${usd(h.pricePerNight)}/noche</span>
        <button data-hotel="${h.id}">Ver</button>
      </li>`,
        )
        .join('')
    : '<li class="empty">No hay hoteles con esos filtros.</li>';
}

export function renderDetail(hotelId) {
  const h = getHotel(hotelId);
  const detail = $('#detail');
  detail.hidden = false;
  detail.innerHTML = `
    <h3>${escape(h.name)}</h3>
    <p>${h.location}, ${h.country} · ${h.priceTier} · ★ ${h.rating} · ${usd(h.pricePerNight)}/noche</p>
    <h4>Reseñas</h4>
    <ul>${h.reviews.map((r) => `<li>${escape(r)}</li>`).join('') || '<li class="empty">Sin reseñas.</li>'}</ul>
    <form id="add-form">
      <input type="hidden" name="hotelId" value="${h.id}" />
      <label>Check-in <input type="date" name="checkIn" min="${today()}" required /></label>
      <label>Noches <input type="number" name="nights" min="1" max="14" value="2" required /></label>
      <button type="submit">Agregar a la reserva</button>
      <p class="error" role="alert"></p>
    </form>`;
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderBooking(booking) {
  const el = $('#booking');
  if (booking.confirmed) {
    el.innerHTML = '<p class="ok">✅ Reserva confirmada. ¡Buen viaje!</p>';
    return;
  }
  if (booking.items.length === 0) {
    el.innerHTML = '<p class="empty">Todavía no agregaste nada.</p>';
    return;
  }
  el.innerHTML = `
    <ul>${booking.items
      .map(
        (i) => `<li>
          <strong>${escape(i.hotel)}</strong>
          <small>${i.checkIn} · ${i.nights} noche(s) · ${usd(i.total)}</small>
          <button class="link" data-remove="${i.hotelId}">Quitar</button>
        </li>`,
      )
      .join('')}</ul>
    <p class="total">Total: ${usd(bookingTotal())}</p>
    <button id="confirm-button">Confirmar reserva</button>`;
}

// El mismo diálogo de confirmación lo usa el botón y, en el paso 5, el agente.
// Si quien lo pidió cancela (signal), el diálogo se cierra como "cancelado".
export function askForConfirmation(booking, { signal } = {}) {
  const dialog = $('#confirm-dialog');
  if (dialog.open) return Promise.resolve(false); // ya hay una confirmación en curso
  $('#confirm-summary').innerHTML = `
    <ul>${booking.items.map((i) => `<li>${escape(i.hotel)} · ${i.checkIn} · ${i.nights} noche(s)</li>`).join('')}</ul>
    <p class="total">Total: ${usd(bookingTotal())}</p>`;
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise((resolve) => {
    signal?.addEventListener('abort', () => dialog.close('cancel'), { once: true });
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
  });
}

export function log(message) {
  const item = document.createElement('li');
  item.textContent = `${new Date().toLocaleTimeString('es-AR')} · ${message}`;
  $('#agent-log').prepend(item);
}

export function initUI() {
  onBookingChange(renderBooking);
  renderBooking(getBooking());
  renderResults(searchHotels());

  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    renderResults(searchHotels(Object.fromEntries(new FormData(e.target))));
  });

  $('#results').addEventListener('click', (e) => {
    const id = e.target.dataset.hotel;
    if (id) renderDetail(id);
  });

  $('#detail').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    try {
      addToBooking({ hotelId: data.get('hotelId'), checkIn: data.get('checkIn'), nights: Number(data.get('nights')) });
      e.target.querySelector('.error').textContent = '';
    } catch (error) {
      e.target.querySelector('.error').textContent = error.message;
    }
  });

  $('#booking').addEventListener('click', async (e) => {
    if (e.target.dataset.remove) removeFromBooking(e.target.dataset.remove);
    if (e.target.id === 'confirm-button' && (await askForConfirmation(getBooking()))) confirmBooking();
  });
}
