(function () {
  var admin = window.NovaAdmin;
  if (!admin) return;

  var API = admin.apiBase;

  var busquedaInicial = '';
  try {
    busquedaInicial = (new URLSearchParams(window.location.search).get('buscar') || '').trim();
  } catch (e) {
    busquedaInicial = '';
  }

  var state = {
    reservas: [],
    estado: 'Todas',
    texto: busquedaInicial.toLowerCase(),
    habitacion: 'Todas'
  };

  var tbody = document.getElementById('reservas-tbody');
  var tableWrap = document.getElementById('reservas-table-wrap');
  var emptyBox = document.getElementById('reservas-empty');
  var countBox = document.getElementById('reservas-count');
  var searchToolbar = document.getElementById('reservas-search');
  var searchTop = document.getElementById('admin-top-search');
  var roomSelect = document.getElementById('reservas-room');
  var exportBtn = document.getElementById('reservas-export');
  var tabs = document.querySelectorAll('.admin-tabs a[data-estado]');

  var modal = document.getElementById('reserva-modal');
  var modalTitle = document.getElementById('reserva-modal-title');
  var modalSubtitle = document.getElementById('reserva-modal-subtitle');
  var modalBody = document.getElementById('reserva-modal-body');

  var HABITACIONES = { clasica: 'Clásica', deluxe: 'Deluxe', nova: 'Suite Nova' };
  var ESTADOS = ['Pendiente', 'Confirmada', 'Check-in', 'Cancelada'];

  if (busquedaInicial) {
    if (searchToolbar) searchToolbar.value = busquedaInicial;
    if (searchTop) searchTop.value = busquedaInicial;
  }

  function el(tag, clase, texto) {
    var nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
  }

  function eur(valor) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(Number(valor) || 0);
  }

  function formatoFecha(valor) {
    if (!valor) return '—';
    var partes = String(valor).split('-');
    if (partes.length !== 3) return valor;
    var fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).format(fecha);
  }

  function formatoFechaHora(valor) {
    if (!valor) return '—';
    var fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return valor;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(fecha);
  }

  function pad(valor) {
    return String(valor).padStart(4, '0');
  }

  function etiquetaHabitacion(tipo) {
    return HABITACIONES[String(tipo || '').toLowerCase()] || tipo || '—';
  }

  function claseEstado(estado) {
    switch (String(estado || '').toLowerCase()) {
      case 'confirmada': return 'badge--confirmed';
      case 'cancelada': return 'badge--cancelled';
      case 'check-in': return 'badge--checkedin';
      default: return 'badge--pending';
    }
  }

  function iniciales(nombre) {
    return String(nombre || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (parte) { return parte.charAt(0); })
      .join('')
      .toUpperCase() || 'NA';
  }

  function norm(valor) {
    return String(valor === undefined || valor === null ? '' : valor).toLowerCase();
  }

  function filtradas() {
    return state.reservas.filter(function (reserva) {
      if (state.estado !== 'Todas') {
        if (norm(reserva.estado) !== norm(state.estado)) return false;
      }
      if (state.habitacion !== 'Todas' && norm(reserva.tipoHabitacion) !== state.habitacion) {
        return false;
      }
      if (state.texto) {
        var blob = [
          reserva.idReserva, reserva.huesped, reserva.correo, reserva.telefono,
          reserva.pais, reserva.ciudad, reserva.tipoHabitacion, reserva.estado,
          reserva.metodoPago, reserva.extras
        ].join(' ').toLowerCase();
        if (blob.indexOf(state.texto) === -1) return false;
      }
      return true;
    });
  }

  function actualizarContadores() {
    var totales = { Todas: state.reservas.length };
    state.reservas.forEach(function (reserva) {
      var clave = (reserva.estado || 'Pendiente');
      totales[clave] = (totales[clave] || 0) + 1;
    });

    Array.prototype.forEach.call(tabs, function (tab) {
      var estado = tab.getAttribute('data-estado');
      var contador = tab.querySelector('[data-count]');
      if (contador) contador.textContent = totales[estado] || 0;
    });
  }

  function celdaReserva(reserva) {
    var td = el('td');
    var stack = el('div', 'cell-stack');
    stack.appendChild(el('strong', null, '#' + pad(reserva.idReserva)));
    stack.appendChild(el('span', null, formatoFechaHora(reserva.fechaReserva)));
    td.appendChild(stack);
    return td;
  }

  function celdaHuesped(reserva) {
    var td = el('td');
    var contenedor = el('div', 'guest-cell');
    contenedor.appendChild(el('span', 'guest-cell__avatar', iniciales(reserva.huesped)));
    var info = el('div');
    info.appendChild(el('strong', null, reserva.huesped || 'Huésped'));
    info.appendChild(el('span', null, reserva.correo || 'Sin correo'));
    contenedor.appendChild(info);
    td.appendChild(contenedor);
    return td;
  }

  function celdaEstancia(reserva) {
    var td = el('td');
    var stack = el('div', 'cell-stack');
    stack.appendChild(el('strong', null, formatoFecha(reserva.fechaLlegada)));
    stack.appendChild(el('span', null, '→ ' + formatoFecha(reserva.fechaSalida) + ' · ' + reserva.noches + ' noches'));
    td.appendChild(stack);
    return td;
  }

  function celdaHabitacion(reserva) {
    var td = el('td');
    var stack = el('div', 'cell-stack');
    stack.appendChild(el('strong', null, etiquetaHabitacion(reserva.tipoHabitacion)));
    stack.appendChild(el('span', null, eur(reserva.precioNoche) + ' / noche'));
    td.appendChild(stack);
    return td;
  }

  function celdaHuespedes(reserva) {
    var td = el('td');
    var stack = el('div', 'cell-stack');
    stack.appendChild(el('strong', null, reserva.adultos + (reserva.adultos === 1 ? ' adulto' : ' adultos')));
    stack.appendChild(el('span', null, (reserva.ninos || 0) + (reserva.ninos === 1 ? ' niño' : ' niños')));
    td.appendChild(stack);
    return td;
  }

  function celdaTexto(valor, clase) {
    var td = el('td');
    td.appendChild(el('span', clase || 'cell-muted', valor || '—'));
    return td;
  }

  function crearFila(reserva) {
    var tr = el('tr');
    tr.appendChild(celdaReserva(reserva));
    tr.appendChild(celdaHuesped(reserva));
    tr.appendChild(celdaEstancia(reserva));
    tr.appendChild(celdaHabitacion(reserva));
    tr.appendChild(celdaHuespedes(reserva));
    tr.appendChild(celdaTexto(reserva.extras, 'cell-muted'));
    tr.appendChild(celdaTexto(reserva.metodoPago, 'cell-muted'));

    var tdTotal = el('td');
    tdTotal.appendChild(el('strong', 'cell-total', eur(reserva.total)));
    tr.appendChild(tdTotal);

    var tdEstado = el('td');
    tdEstado.appendChild(el('span', 'badge ' + claseEstado(reserva.estado), reserva.estado || 'Pendiente'));
    tr.appendChild(tdEstado);

    var tdAcciones = el('td');
    var acciones = el('div', 'table-actions');

    var selector = el('select', 'select select--sm');
    ESTADOS.forEach(function (estado) {
      var opcion = el('option', null, estado);
      opcion.value = estado;
      selector.appendChild(opcion);
    });
    selector.value = reserva.estado || 'Pendiente';
    selector.addEventListener('change', function () {
      cambiarEstado(reserva, selector.value, selector);
    });
    acciones.appendChild(selector);

    var boton = el('button', 'btn-admin btn-admin--ghost btn-admin--sm', 'Ver');
    boton.type = 'button';
    boton.addEventListener('click', function () { abrirDetalle(reserva); });
    acciones.appendChild(boton);

    tdAcciones.appendChild(acciones);
    tr.appendChild(tdAcciones);

    return tr;
  }

  function cambiarEstado(reserva, estado, control) {
    if (control) control.disabled = true;

    fetch(API + '/api/reservas/' + reserva.idReserva + '/estado', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: estado })
    })
      .then(function (response) {
        if (!response.ok) {
          return response.text().then(function (texto) {
            throw new Error(texto || 'No se pudo actualizar el estado.');
          });
        }
        return response.json();
      })
      .then(function (actualizada) {
        var indice = state.reservas.findIndex(function (item) {
          return item.idReserva === actualizada.idReserva;
        });
        if (indice !== -1) state.reservas[indice] = actualizada;
        render();
        if (window.showAdminToast) {
          window.showAdminToast('Reserva #' + pad(actualizada.idReserva) + ' actualizada a ' + actualizada.estado + '.', 'success');
        }
        if (modal && !modal.hidden && modalTitle
            && modalTitle.textContent === 'Reserva #' + pad(actualizada.idReserva)) {
          abrirDetalle(actualizada);
        }
      })
      .catch(function (error) {
        if (window.showAdminToast) {
          window.showAdminToast(error.message || 'No se pudo actualizar el estado.', 'error');
        } else {
          window.alert(error.message || 'No se pudo actualizar el estado.');
        }
        if (control) {
          control.value = reserva.estado || 'Pendiente';
          control.disabled = false;
        }
      });
  }

  function mostrarVacio(titulo, texto) {
    if (!emptyBox) return;
    emptyBox.hidden = false;
    var h = emptyBox.querySelector('strong');
    var p = emptyBox.querySelector('p');
    var enlace = emptyBox.querySelector('a');
    if (h) h.textContent = titulo;
    if (p) p.textContent = texto;
    if (enlace) enlace.hidden = true;
  }

  function render() {
    var lista = filtradas();

    if (tbody) {
      tbody.textContent = '';
      lista.forEach(function (reserva) {
        tbody.appendChild(crearFila(reserva));
      });
    }

    if (tableWrap) tableWrap.hidden = lista.length === 0;
    if (emptyBox) {
      emptyBox.hidden = lista.length !== 0;
      if (lista.length === 0) {
        if (state.reservas.length === 0) {
          mostrarVacio('No hay reservas registradas', 'Las reservas que se creen aparecerán aquí.');
        } else {
          mostrarVacio('Sin resultados', 'No hay reservas que coincidan con los filtros aplicados.');
        }
      }
    }

    if (countBox) {
      countBox.textContent = lista.length + ' de ' + state.reservas.length +
        (state.reservas.length === 1 ? ' reserva' : ' reservas');
    }

    actualizarContadores();
  }

  function agregarCampo(dl, etiqueta, valor, clase) {
    var bloque = el('div', clase || null);
    bloque.appendChild(el('dt', null, etiqueta));
    if (valor instanceof Node) {
      var dd = el('dd');
      dd.appendChild(valor);
      bloque.appendChild(dd);
    } else {
      bloque.appendChild(el('dd', null, valor === null || valor === undefined || valor === '' ? '—' : valor));
    }
    dl.appendChild(bloque);
  }

  function abrirDetalle(reserva) {
    if (!modal) return;

    if (modalTitle) modalTitle.textContent = 'Reserva #' + pad(reserva.idReserva);
    if (modalSubtitle) {
      modalSubtitle.textContent = (reserva.huesped || 'Huésped') + ' · ' + etiquetaHabitacion(reserva.tipoHabitacion);
    }

    if (modalBody) {
      modalBody.textContent = '';
      var dl = el('dl', 'reserva-detail');

      agregarCampo(dl, 'Estado', el('span', 'badge ' + claseEstado(reserva.estado), reserva.estado || 'Pendiente'));
      agregarCampo(dl, 'Fecha de reserva', formatoFechaHora(reserva.fechaReserva));
      agregarCampo(dl, 'Huésped', reserva.huesped);
      agregarCampo(dl, 'Correo', reserva.correo);
      agregarCampo(dl, 'Teléfono', reserva.telefono);
      agregarCampo(dl, 'País', reserva.pais);
      agregarCampo(dl, 'Ciudad', reserva.ciudad);
      agregarCampo(dl, 'Llegada', formatoFecha(reserva.fechaLlegada));
      agregarCampo(dl, 'Salida', formatoFecha(reserva.fechaSalida));
      agregarCampo(dl, 'Noches', reserva.noches);
      agregarCampo(dl, 'Habitación', etiquetaHabitacion(reserva.tipoHabitacion));
      agregarCampo(dl, 'Precio por noche', eur(reserva.precioNoche));
      agregarCampo(dl, 'Adultos', reserva.adultos);
      agregarCampo(dl, 'Niños', reserva.ninos || 0);
      agregarCampo(dl, 'Extras', reserva.extras);
      agregarCampo(dl, 'Método de pago', reserva.metodoPago);
      agregarCampo(dl, 'Total', el('strong', 'cell-total', eur(reserva.total)));
      agregarCampo(dl, 'Peticiones', reserva.peticiones, 'reserva-detail__wide');
      agregarCampo(dl, 'ID de usuario', reserva.idUsuario);

      modalBody.appendChild(dl);

      var acciones = el('div', 'reserva-actions');
      var opciones = [
        { valor: 'Confirmada', texto: 'Confirmar', clase: 'btn-admin--gold' },
        { valor: 'Check-in', texto: 'Hacer check-in', clase: 'btn-admin--ghost' },
        { valor: 'Cancelada', texto: 'Cancelar reserva', clase: 'btn-admin--danger' }
      ];

      opciones.forEach(function (opcion) {
        var boton = el('button', 'btn-admin ' + opcion.clase, opcion.texto);
        boton.type = 'button';
        boton.disabled = reserva.estado === opcion.valor || reserva.estado === 'Cancelada';
        boton.addEventListener('click', function () {
          cambiarEstado(reserva, opcion.valor, boton);
        });
        acciones.appendChild(boton);
      });

      modalBody.appendChild(acciones);
    }

    modal.hidden = false;
    document.body.classList.add('no-scroll');
  }

  function cerrarDetalle() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
  }

  if (modal) {
    Array.prototype.forEach.call(modal.querySelectorAll('[data-close-modal]'), function (boton) {
      boton.addEventListener('click', cerrarDetalle);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) cerrarDetalle();
    });
  }

  Array.prototype.forEach.call(tabs, function (tab) {
    tab.addEventListener('click', function (event) {
      event.preventDefault();
      Array.prototype.forEach.call(tabs, function (otro) { otro.classList.remove('is-active'); });
      tab.classList.add('is-active');
      state.estado = tab.getAttribute('data-estado');
      render();
    });
  });

  function aplicarBusqueda(valor) {
    state.texto = String(valor || '').trim().toLowerCase();
    render();
  }

  if (searchToolbar) {
    searchToolbar.addEventListener('input', function () { aplicarBusqueda(searchToolbar.value); });
  }
  if (searchTop) {
    searchTop.addEventListener('input', function () {
      if (searchToolbar) searchToolbar.value = searchTop.value;
      aplicarBusqueda(searchTop.value);
    });
  }
  if (roomSelect) {
    roomSelect.addEventListener('change', function () {
      state.habitacion = roomSelect.value;
      render();
    });
  }

  function escaparCsv(valor) {
    var texto = String(valor === undefined || valor === null ? '' : valor);
    return '"' + texto.replace(/"/g, '""') + '"';
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      var lista = filtradas();
      var cabeceras = [
        'Codigo', 'Fecha reserva', 'Huesped', 'Correo', 'Telefono', 'Pais', 'Ciudad',
        'Llegada', 'Salida', 'Noches', 'Habitacion', 'Precio noche', 'Adultos', 'Ninos',
        'Extras', 'Metodo pago', 'Total', 'Estado', 'Peticiones'
      ];
      var lineas = [cabeceras.map(escaparCsv).join(';')];
      lista.forEach(function (reserva) {
        lineas.push([
          '#' + pad(reserva.idReserva), formatoFechaHora(reserva.fechaReserva),
          reserva.huesped, reserva.correo, reserva.telefono, reserva.pais, reserva.ciudad,
          reserva.fechaLlegada, reserva.fechaSalida, reserva.noches,
          etiquetaHabitacion(reserva.tipoHabitacion), reserva.precioNoche,
          reserva.adultos, reserva.ninos, reserva.extras, reserva.metodoPago,
          reserva.total, reserva.estado, reserva.peticiones
        ].map(escaparCsv).join(';'));
      });

      var blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'reservas-novahotel-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);
    });
  }

  if (emptyBox) {
    mostrarVacio('Cargando reservas...', 'Estamos consultando las reservas registradas.');
    var enlace = emptyBox.querySelector('a');
    if (enlace) enlace.hidden = true;
  }
  if (countBox) countBox.textContent = 'Cargando reservas...';

  fetch(API + '/api/reservas')
    .then(function (response) {
      if (!response.ok) throw new Error('No se pudieron cargar las reservas.');
      return response.json();
    })
    .then(function (reservas) {
      state.reservas = Array.isArray(reservas) ? reservas : [];
      render();
    })
    .catch(function (error) {
      if (tableWrap) tableWrap.hidden = true;
      mostrarVacio('No se pudieron cargar las reservas', error.message || 'Intenta de nuevo más tarde.');
      if (countBox) countBox.textContent = 'Error al cargar';
    });
})();
