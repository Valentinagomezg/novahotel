(function () {
  var form = document.querySelector('form.booking-layout');
  if (!form) return;

  var API_BASE = (window.location.port === '8080') ? '' : 'http://localhost:8080';
  var USER_KEY = 'novaUsuario';

  var PRECIOS = { clasica: 180, deluxe: 240, nova: 480 };
  var NOMBRES = { clasica: 'Clásica', deluxe: 'Deluxe', nova: 'Suite Nova' };
  var DETALLES = { clasica: '28 m² · 2 personas', deluxe: '36 m² · 2 personas', nova: '68 m² · 4 personas' };
  var EXTRAS = {
    'Traslado aeropuerto · 60 €': 60,
    'Cena romántica · 120 €': 120,
    'Ritual spa para dos · 90 €': 90,
    'Pack bienvenida · 45 €': 45
  };

  var llegada = document.getElementById('llegada');
  var salida = document.getElementById('salida');
  var nochesInput = document.getElementById('noches');
  var adultos = document.getElementById('adultos');
  var ninos = document.getElementById('ninos');
  var extras = document.getElementById('extras');
  var errorBox = document.getElementById('booking-error');
  var submitButton = form.querySelector('button[type="submit"]');
  var paymentCardFields = document.getElementById('payment-card-fields');

  var hoy = new Date().toISOString().split('T')[0];
  if (llegada) llegada.min = hoy;
  if (salida) salida.min = hoy;

  function usuarioActual() {
    try {
      var raw = sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function eur(valor) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(valor);
  }

  function formatoFecha(valor) {
    if (!valor) return '—';
    var partes = valor.split('-');
    if (partes.length !== 3) return valor;
    var fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).format(fecha);
  }

  function calcularNoches() {
    if (!llegada.value || !salida.value) return 0;
    var a = new Date(llegada.value + 'T00:00:00');
    var b = new Date(salida.value + 'T00:00:00');
    var ms = b - a;
    return ms > 0 ? Math.round(ms / 86400000) : 0;
  }

  function habitacionSeleccionada() {
    var radio = form.querySelector('input[name="habitacion"]:checked');
    return radio ? radio.value : null;
  }

  function pagoSeleccionado() {
    var radio = form.querySelector('input[name="pago"]:checked');
    return radio ? radio.value : null;
  }

  function actualizarPago() {
    if (!paymentCardFields) return;
    paymentCardFields.hidden = pagoSeleccionado() !== 'tarjeta';
  }

  function actualizarResumen() {
    var noches = calcularNoches();
    var tipo = habitacionSeleccionada();
    var precio = tipo ? PRECIOS[tipo] : 0;
    var extra = extras && EXTRAS[extras.value] ? EXTRAS[extras.value] : 0;
    var subtotal = precio * noches;
    var total = subtotal + extra;

    if (nochesInput) nochesInput.value = noches > 0 ? noches : '';
    if (salida && llegada.value) salida.min = llegada.value;

    var set = function (id, valor) {
      var el = document.getElementById(id);
      if (el) el.textContent = valor;
    };

    set('res-llegada', formatoFecha(llegada.value));
    set('res-salida', formatoFecha(salida.value));
    set('res-noches', noches > 0 ? noches + (noches === 1 ? ' noche' : ' noches') : '—');
    set('res-precio', precio ? eur(precio) + ' / noche' : '—');

    var huespedes = '';
    if (adultos.value) {
      huespedes = adultos.value + (adultos.value === '1' ? ' adulto' : ' adultos');
      if (ninos.value && ninos.value !== '0') {
        huespedes += ' · ' + ninos.value + (ninos.value === '1' ? ' niño' : ' niños');
      }
    }
    set('res-huespedes', huespedes || '—');
    set('res-tasas', extra ? eur(extra) : 'Incluidas');
    set('res-total', total ? eur(total) : '—');

    var titulo = document.getElementById('res-room-title');
    var detalle = document.getElementById('res-room-detail');
    if (titulo) titulo.textContent = tipo ? NOMBRES[tipo] : 'Sin habitación seleccionada';
    if (detalle) {
      detalle.textContent = tipo
        ? noches + (noches === 1 ? ' noche' : ' noches') + ' · ' + NOMBRES[tipo]
        : 'Elige una habitación para ver los detalles';
    }
  }

  function mostrarError(mensaje) {
    if (!errorBox) {
      window.alert(mensaje);
      return;
    }
    errorBox.textContent = mensaje;
    errorBox.hidden = false;
  }

  function limpiarError() {
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.hidden = true;
  }

  ['change', 'input'].forEach(function (evento) {
    form.addEventListener(evento, function () {
      limpiarError();
      actualizarPago();
      actualizarResumen();
    });
  });

  var usuario = usuarioActual();
  if (usuario) {
    var setValor = function (id, valor) {
      var el = document.getElementById(id);
      if (el && !el.value) el.value = valor || '';
    };
    setValor('nombre', usuario.nombre);
    setValor('apellidos', usuario.apellidos);
    setValor('email', usuario.correo);
  }

  function cargarHabitaciones() {
    fetch(API_BASE + '/api/habitaciones')
      .then(function (response) {
        if (!response.ok) throw new Error('No se pudieron cargar las habitaciones.');
        return response.json();
      })
      .then(function (habitaciones) {
        if (!Array.isArray(habitaciones)) return;

        var inventario = {};
        var libresHoy = {};
        var precios = {};

        habitaciones.forEach(function (habitacion) {
          var tipo = String(habitacion.tipo || '').toLowerCase();
          if (!tipo) return;

          if (precios[tipo] === undefined || Number(habitacion.precioNoche) < precios[tipo]) {
            precios[tipo] = Number(habitacion.precioNoche);
          }

          if (habitacion.estado === 'Disponible') {
            inventario[tipo] = (inventario[tipo] || 0) + 1;
            if (!habitacion.ocupadaHoy) {
              libresHoy[tipo] = (libresHoy[tipo] || 0) + 1;
            }
          }
        });

        Object.keys(PRECIOS).forEach(function (tipo) {
          var precio = precios[tipo] || PRECIOS[tipo];
          PRECIOS[tipo] = precio;

          var radio = form.querySelector('input[name="habitacion"][value="' + tipo + '"]');
          if (!radio) return;

          var total = inventario[tipo] || 0;
          var libres = libresHoy[tipo] || 0;
          radio.disabled = total === 0;
          radio.setAttribute('data-disponibles', libres);

          var label = form.querySelector('label[for="' + radio.id + '"] .radio-card__detail');
          if (label) {
            label.textContent = DETALLES[tipo] + ' · ' + eur(precio) + '/noche' +
              (total === 0
                ? ' · No disponible'
                : ' · ' + libres + (libres === 1 ? ' libre hoy' : ' libres hoy'));
          }

          if (radio.disabled && radio.checked) {
            radio.checked = false;
          }
        });

        actualizarResumen();
      })
      .catch(function () { /* se mantienen las tarifas por defecto */ });
  }

  actualizarPago();
  actualizarResumen();
  cargarHabitaciones();

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    limpiarError();

    var currentUser = usuarioActual();
    if (!currentUser || !currentUser.idUsuario) {
      window.alert('Debes iniciar sesión para hacer una reserva.');
      window.location.href = 'login.html';
      return;
    }

    var tipo = habitacionSeleccionada();
    if (!tipo) {
      mostrarError('Debes elegir una habitación.');
      return;
    }

    var noches = calcularNoches();
    if (noches < 1) {
      mostrarError('La fecha de salida debe ser posterior a la de llegada.');
      return;
    }

    if (!pagoSeleccionado()) {
      mostrarError('Debes elegir un método de pago.');
      return;
    }

    var payload = {
      idUsuario: currentUser.idUsuario,
      fechaLlegada: llegada.value,
      fechaSalida: salida.value,
      adultos: Number(adultos.value),
      ninos: ninos.value ? Number(ninos.value) : 0,
      tipoHabitacion: tipo,
      extras: extras ? extras.value : null,
      metodoPago: pagoSeleccionado(),
      telefono: document.getElementById('telefono').value.trim(),
      pais: document.getElementById('pais').value,
      ciudad: document.getElementById('ciudad').value.trim(),
      peticiones: document.getElementById('peticiones').value.trim()
    };

    if (submitButton) submitButton.disabled = true;

    fetch(API_BASE + '/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        if (!response.ok) {
          return response.text().then(function (mensaje) {
            throw new Error(mensaje || 'No se pudo crear la reserva.');
          });
        }
        return response.json();
      })
      .then(function (creada) {
        var destino = 'cuenta.html';
        if (creada && creada.idReserva) {
          destino += '?reserva=' + encodeURIComponent(creada.idReserva);
        }
        window.location.href = destino;
      })
      .catch(function (error) {
        mostrarError(error.message || 'No se pudo conectar con el servidor.');
        if (submitButton) submitButton.disabled = false;
      });
  });
})();
