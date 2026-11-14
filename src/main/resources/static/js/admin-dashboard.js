(function () {
  var admin = window.NovaAdmin;
  if (!admin) return;

  var API = admin.apiBase;
  var HABITACIONES = { clasica: 'Clásica', deluxe: 'Deluxe', nova: 'Suite Nova' };

  function el(tag, clase, texto) {
    var nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
  }

  function eur(valor) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(Number(valor) || 0);
  }

  function isoLocal(fecha) {
    return fecha.getFullYear() + '-' +
      String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
      String(fecha.getDate()).padStart(2, '0');
  }

  function formatoFecha(valor) {
    if (!valor) return '—';
    var partes = String(valor).split('-');
    if (partes.length !== 3) return valor;
    var fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit', month: 'short'
    }).format(fecha);
  }

  function formatoFechaLarga(valor) {
    if (!valor) return '—';
    var partes = String(valor).split('-');
    if (partes.length !== 3) return valor;
    var fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'short', day: '2-digit', month: 'short'
    }).format(fecha);
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

  function norm(valor) {
    return String(valor === undefined || valor === null ? '' : valor).toLowerCase();
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

  function pad(valor) {
    return String(valor).padStart(4, '0');
  }

  function setTexto(id, valor) {
    var nodo = document.getElementById(id);
    if (nodo) nodo.textContent = valor;
  }

  function toggle(id, visible) {
    var nodo = document.getElementById(id);
    if (nodo) nodo.hidden = !visible;
  }

  function activa(reserva) {
    var estado = norm(reserva.estado);
    return estado !== 'cancelada';
  }

  var hoy = new Date();
  var hoyIso = isoLocal(hoy);
  var mesActual = hoyIso.slice(0, 7);

  setTexto('dashboard-fecha', new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(hoy));

  function renderRecientes(reservas) {
    var contenedor = document.getElementById('dashboard-recientes');
    var wrap = document.getElementById('dashboard-recientes-wrap');
    var vacio = document.getElementById('dashboard-recientes-empty');
    if (!contenedor) return;

    contenedor.textContent = '';
    reservas.slice(0, 6).forEach(function (reserva) {
      var tr = el('tr');

      var tdCodigo = el('td');
      var stack = el('div', 'cell-stack');
      stack.appendChild(el('strong', null, '#' + pad(reserva.idReserva)));
      stack.appendChild(el('span', null, formatoFecha(reserva.fechaLlegada) + ' → ' + formatoFecha(reserva.fechaSalida)));
      tdCodigo.appendChild(stack);
      tr.appendChild(tdCodigo);

      var tdHuesped = el('td');
      var huesped = el('div', 'guest-cell');
      huesped.appendChild(el('span', 'guest-cell__avatar', iniciales(reserva.huesped)));
      var info = el('div');
      info.appendChild(el('strong', null, reserva.huesped || 'Huésped'));
      info.appendChild(el('span', null, etiquetaHabitacion(reserva.tipoHabitacion)));
      huesped.appendChild(info);
      tdHuesped.appendChild(huesped);
      tr.appendChild(tdHuesped);

      var tdTotal = el('td');
      tdTotal.appendChild(el('strong', 'cell-total', eur(reserva.total)));
      tr.appendChild(tdTotal);

      var tdEstado = el('td');
      tdEstado.appendChild(el('span', 'badge ' + claseEstado(reserva.estado), reserva.estado || 'Pendiente'));
      tr.appendChild(tdEstado);

      contenedor.appendChild(tr);
    });

    toggle('dashboard-recientes-wrap', reservas.length > 0);
    toggle('dashboard-recientes-empty', reservas.length === 0);
  }

  function renderLista(idLista, idVacio, reservas, nota) {
    var lista = document.getElementById(idLista);
    if (!lista) return;

    lista.textContent = '';
    reservas.forEach(function (reserva) {
      var fila = el('div', 'arrival');
      fila.appendChild(el('div', 'arrival__time', reserva.noches + 'n'));

      var info = el('div', 'arrival__info');
      info.appendChild(el('strong', null, reserva.huesped || 'Huésped'));
      info.appendChild(el('span', null,
        etiquetaHabitacion(reserva.tipoHabitacion) + ' · ' +
        formatoFecha(nota === 'salida' ? reserva.fechaLlegada : reserva.fechaSalida) + ' · ' +
        (reserva.estado || 'Pendiente')
      ));
      fila.appendChild(info);

      var badge = el('span', 'badge ' + claseEstado(reserva.estado), reserva.estado || 'Pendiente');
      fila.appendChild(badge);

      lista.appendChild(fila);
    });

    toggle(idLista, reservas.length > 0);
    toggle(idVacio, reservas.length === 0);
  }

  function renderTipologias(reservas) {
    var contenedor = document.getElementById('dashboard-tipologias');
    if (!contenedor) return;

    var conteo = {};
    var total = 0;
    reservas.filter(activa).forEach(function (reserva) {
      var clave = etiquetaHabitacion(reserva.tipoHabitacion);
      conteo[clave] = (conteo[clave] || 0) + 1;
      total += 1;
    });

    var entradas = Object.keys(conteo).map(function (clave) {
      return { nombre: clave, total: conteo[clave] };
    }).sort(function (a, b) { return b.total - a.total; });

    contenedor.textContent = '';
    entradas.forEach(function (entrada) {
      var fila = el('div', 'occupancy__row');
      var top = el('div', 'occupancy__top');
      top.appendChild(el('span', null, entrada.nombre));
      top.appendChild(el('strong', null, entrada.total + (entrada.total === 1 ? ' reserva' : ' reservas')));
      fila.appendChild(top);

      var barra = el('div', 'bar');
      var relleno = el('div', 'bar__fill');
      var porcentaje = total ? Math.max(6, Math.round((entrada.total / total) * 100)) : 0;
      relleno.style.width = porcentaje + '%';
      barra.appendChild(relleno);
      fila.appendChild(barra);

      contenedor.appendChild(fila);
    });

    toggle('dashboard-tipologias', entradas.length > 0);
    toggle('dashboard-tipologias-empty', entradas.length === 0);
    setTexto('dashboard-tipologias-count',
      entradas.length ? entradas.length + ' tipologías con reservas activas' : 'Sin reservas activas');
  }

  function renderChart(reservas) {
    var contenedor = document.getElementById('dashboard-chart');
    if (!contenedor) return;

    var dias = [];
    for (var i = 0; i < 7; i++) {
      var fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
      dias.push({ fecha: fecha, iso: isoLocal(fecha), total: 0 });
    }

    reservas.filter(activa).forEach(function (reserva) {
      dias.forEach(function (dia) {
        if (reserva.fechaLlegada <= dia.iso && reserva.fechaSalida > dia.iso) {
          dia.total += 1;
        }
      });
    });

    var maximo = Math.max.apply(null, dias.map(function (dia) { return dia.total; }).concat([1]));

    contenedor.textContent = '';
    dias.forEach(function (dia) {
      var columna = el('div', 'chart__col');
      var barras = el('div', 'chart__bars');
      var barra = el('div', 'chart__bar');
      barra.style.height = Math.max(6, Math.round((dia.total / maximo) * 100)) + '%';
      barra.title = dia.total + ' reservas activas el ' + formatoFecha(dia.iso);
      barras.appendChild(barra);
      columna.appendChild(barras);
      columna.appendChild(el('span', 'chart__label', formatoFechaLarga(dia.iso)));
      contenedor.appendChild(columna);
    });

    toggle('dashboard-chart', true);
    toggle('dashboard-chart-empty', dias.length === 0);
    setTexto('dashboard-chart-note', 'Reservas activas por noche · próximos 7 días');
  }

  fetch(API + '/api/reservas')
    .then(function (response) {
      if (!response.ok) throw new Error('No se pudieron cargar las reservas.');
      return response.json();
    })
    .then(function (datos) {
      var reservas = Array.isArray(datos) ? datos : [];

      var reservasHoy = reservas.filter(function (reserva) {
        return String(reserva.fechaReserva || '').slice(0, 10) === hoyIso;
      }).length;

      var activas = reservas.filter(function (reserva) {
        return norm(reserva.estado) !== 'cancelada';
      });

      var ingresosMes = reservas.filter(function (reserva) {
        return activa(reserva) && String(reserva.fechaLlegada || '').slice(0, 7) === mesActual;
      }).reduce(function (suma, reserva) {
        return suma + (Number(reserva.total) || 0);
      }, 0);

      var checkinsPendientes = reservas.filter(function (reserva) {
        var estado = norm(reserva.estado);
        return reserva.fechaLlegada === hoyIso && estado !== 'cancelada' && estado !== 'check-in';
      });

      var llegadasHoy = reservas.filter(function (reserva) {
        return reserva.fechaLlegada === hoyIso && norm(reserva.estado) !== 'cancelada';
      });

      var salidasHoy = reservas.filter(function (reserva) {
        return reserva.fechaSalida === hoyIso && norm(reserva.estado) !== 'cancelada';
      });

      setTexto('dashboard-reservas-hoy', reservasHoy);
      setTexto('dashboard-reservas-hoy-foot',
        reservasHoy ? 'Creadas durante la jornada' : 'Sin movimientos registrados');

      setTexto('dashboard-activas', activas.length);
      setTexto('dashboard-activas-foot',
        activas.length ? 'Reservas pendientes, confirmadas o en estancia' : 'Sin reservas activas');

      setTexto('dashboard-ingresos', eur(ingresosMes));
      setTexto('dashboard-ingresos-foot',
        ingresosMes ? 'Estancias previstas este mes' : 'Sin ingresos registrados');

      setTexto('dashboard-checkins', checkinsPendientes.length);
      setTexto('dashboard-checkins-foot',
        checkinsPendientes.length ? 'Llegadas de hoy por recibir' : 'Sin llegadas previstas');

      renderChart(reservas);
      renderTipologias(reservas);
      renderRecientes(reservas);
      renderLista('dashboard-llegadas', 'dashboard-llegadas-empty', llegadasHoy, 'llegada');
      renderLista('dashboard-salidas', 'dashboard-salidas-empty', salidasHoy, 'salida');

      setTexto('dashboard-llegadas-count',
        llegadasHoy.length ? llegadasHoy.length + ' llegadas previstas para hoy' : 'Sin check-ins previstos');
      setTexto('dashboard-salidas-count',
        salidasHoy.length ? salidasHoy.length + ' salidas previstas para hoy' : 'Sin salidas previstas');
    })
    .catch(function () {
      setTexto('dashboard-reservas-hoy-foot', 'No se pudieron cargar los datos');
      setTexto('dashboard-activas-foot', 'No se pudieron cargar los datos');
      setTexto('dashboard-ingresos-foot', 'No se pudieron cargar los datos');
      setTexto('dashboard-checkins-foot', 'No se pudieron cargar los datos');
    });
})();
