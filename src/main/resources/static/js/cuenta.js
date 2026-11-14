(function () {
  var API_BASE = (window.location.port === '8080') ? '' : 'http://localhost:8080';
  var USER_KEY = 'novaUsuario';

  function leerUsuario() {
    var raw = null;

    try { raw = sessionStorage.getItem(USER_KEY); } catch (e) { /* noop */ }
    if (!raw) { try { raw = localStorage.getItem(USER_KEY); } catch (e) { /* noop */ } }
    if (!raw) return null;

    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function guardarUsuario(usuario) {
    var raw = JSON.stringify(usuario);
    try { sessionStorage.setItem(USER_KEY, raw); } catch (e) { /* noop */ }
    try { localStorage.setItem(USER_KEY, raw); } catch (e) { /* noop */ }
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

  function el(tag, clase, texto) {
    var nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
  }

  function nombreHabitacion(tipo) {
    var nombres = { clasica: 'Clásica', deluxe: 'Deluxe', nova: 'Suite Nova' };
    return nombres[tipo] || tipo || 'Habitación';
  }

  var usuario = leerUsuario();

  var logout = document.getElementById('logout-link');
  if (logout) {
    logout.addEventListener('click', function () {
      try { sessionStorage.removeItem(USER_KEY); } catch (e) { /* noop */ }
      try { localStorage.removeItem(USER_KEY); } catch (e) { /* noop */ }
    });
  }

  if (!usuario) {
    window.location.href = 'login.html';
    return;
  }

  var hero = document.getElementById('hero-nombre');
  if (hero) hero.textContent = usuario.nombre || 'huésped';

  var perfilNombre = document.getElementById('profile-nombre');
  if (perfilNombre) perfilNombre.textContent = (usuario.nombre || '') + ' ' + (usuario.apellidos || '');

  var perfilCorreo = document.getElementById('profile-correo');
  if (perfilCorreo) perfilCorreo.textContent = usuario.correo || '';

  var lista = document.getElementById('reservas-list');
  var vacio = document.getElementById('reservas-empty');
  var notice = document.getElementById('reserva-success');

  function mostrarAviso(mensaje, tipo) {
    if (!notice) return;
    notice.textContent = mensaje;
    notice.className = 'account__notice' + (tipo === 'error' ? ' account__notice--error' : '');
    notice.hidden = false;
  }

  function crearTarjeta(reserva) {
    var tarjeta = el('article', 'reserva');

    var top = el('div', 'reserva__top');
    var estado = String(reserva.estado || 'Pendiente');
    top.appendChild(el('span', 'reserva__estado reserva__estado--' + estado.toLowerCase(), estado));
    top.appendChild(el('span', 'reserva__id', '#' + String(reserva.idReserva).padStart(4, '0')));
    tarjeta.appendChild(top);

    tarjeta.appendChild(el(
      'h3',
      'reserva__titulo',
      nombreHabitacion(reserva.tipoHabitacion) + ' · ' + reserva.noches +
        (reserva.noches === 1 ? ' noche' : ' noches')
    ));

    tarjeta.appendChild(el(
      'p',
      'reserva__fechas',
      formatoFecha(reserva.fechaLlegada) + ' → ' + formatoFecha(reserva.fechaSalida)
    ));

    var meta = el('div', 'reserva__meta');
    var huespedes = reserva.adultos + (reserva.adultos === 1 ? ' adulto' : ' adultos');
    if (reserva.ninos > 0) {
      huespedes += ' · ' + reserva.ninos + (reserva.ninos === 1 ? ' niño' : ' niños');
    }
    meta.appendChild(el('span', null, huespedes));
    if (reserva.extras && reserva.extras !== 'Sin extras' && reserva.extras.indexOf('Selecciona') !== 0) {
      meta.appendChild(el('span', null, reserva.extras));
    }
    if (reserva.metodoPago) {
      meta.appendChild(el('span', null, 'Pago: ' + reserva.metodoPago));
    }
    tarjeta.appendChild(meta);

    var bottom = el('div', 'reserva__bottom');
    bottom.appendChild(el('span', null, 'Total'));
    bottom.appendChild(el('strong', null, eur(reserva.total)));
    tarjeta.appendChild(bottom);

    if (estado !== 'Cancelada' && estado !== 'Check-in') {
      var acciones = el('div', 'reserva__acciones');
      var boton = el('button', 'reserva__cancelar', 'Cancelar reserva');
      boton.type = 'button';
      boton.addEventListener('click', function () {
        cancelarReserva(reserva, boton);
      });
      acciones.appendChild(boton);
      tarjeta.appendChild(acciones);
    }

    return tarjeta;
  }

  function cancelarReserva(reserva, boton) {
    var confirmado = window.confirm(
      '¿Seguro que quieres cancelar la reserva #' + String(reserva.idReserva).padStart(4, '0') + '?'
    );
    if (!confirmado) return;

    boton.disabled = true;
    boton.textContent = 'Cancelando...';

    fetch(API_BASE + '/api/reservas/' + reserva.idReserva + '/cancelar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario: usuario.idUsuario })
    })
      .then(function (response) {
        if (!response.ok) {
          return response.text().then(function (texto) {
            throw new Error(texto || 'No se pudo cancelar la reserva.');
          });
        }
        return response.json();
      })
      .then(function () {
        mostrarAviso('Tu reserva #' + String(reserva.idReserva).padStart(4, '0') + ' se ha cancelado correctamente.');
        cargarReservas();
      })
      .catch(function (error) {
        mostrarAviso(error.message || 'No se pudo cancelar la reserva.', 'error');
        boton.disabled = false;
        boton.textContent = 'Cancelar reserva';
      });
  }

  function actualizarStats(reservas) {
    var stats = document.getElementById('reservas-stats');
    if (!stats) return;

    if (!reservas || reservas.length === 0) {
      stats.hidden = true;
      return;
    }

    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    var activas = reservas.filter(function (reserva) {
      return String(reserva.estado || '').toLowerCase() !== 'cancelada';
    });
    var noches = 0;
    var gastado = 0;
    var proxima = null;

    activas.forEach(function (reserva) {
      noches += Number(reserva.noches) || 0;
      gastado += Number(reserva.total) || 0;
      var partes = String(reserva.fechaLlegada || '').split('-');
      if (partes.length === 3) {
        var fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
        if (fecha >= hoy && (!proxima || fecha < proxima)) proxima = fecha;
      }
    });

    var proximaTexto = proxima
      ? new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(proxima)
      : '—';

    var totalBox = document.getElementById('stats-total');
    var proximaBox = document.getElementById('stats-proxima');
    var nochesBox = document.getElementById('stats-noches');
    var gastadoBox = document.getElementById('stats-gastado');
    if (totalBox) totalBox.textContent = activas.length;
    if (proximaBox) proximaBox.textContent = proximaTexto;
    if (nochesBox) nochesBox.textContent = noches;
    if (gastadoBox) gastadoBox.textContent = eur(gastado);
    stats.hidden = false;
  }

  function pintarReservas(reservas) {
    actualizarStats(reservas);

    if (!reservas || reservas.length === 0) {
      if (vacio) vacio.hidden = false;
      if (lista) lista.hidden = true;
      return;
    }

    if (vacio) vacio.hidden = true;
    if (lista) {
      lista.hidden = false;
      lista.textContent = '';
      reservas.forEach(function (reserva) {
        lista.appendChild(crearTarjeta(reserva));
      });
    }
  }

  function cargarReservas() {
    return fetch(API_BASE + '/api/reservas/usuario/' + usuario.idUsuario)
      .then(function (response) {
        if (!response.ok) throw new Error('No se pudieron cargar las reservas.');
        return response.json();
      })
      .then(function (reservas) {
        pintarReservas(reservas);
        return reservas;
      })
      .catch(function (error) {
        if (vacio) {
          vacio.hidden = false;
          var titulo = vacio.querySelector('h3');
          var texto = vacio.querySelector('p');
          if (titulo) titulo.textContent = 'No se pudieron cargar tus reservas';
          if (texto) texto.textContent = error.message || 'Intenta de nuevo más tarde.';
        }
        return null;
      });
  }

  var params = new URLSearchParams(window.location.search);
  var nuevaReserva = params.get('reserva');

  cargarReservas().then(function (reservas) {
    if (!nuevaReserva || !reservas) return;

    var encontrada = (reservas || []).find(function (reserva) {
      return String(reserva.idReserva) === String(nuevaReserva);
    });

    var codigo = '#' + String(nuevaReserva).padStart(4, '0');
    if (encontrada) {
      mostrarAviso(
        'Reserva ' + codigo + ' registrada correctamente. Estado: ' + encontrada.estado + '.'
      );
    } else {
      mostrarAviso('Reserva ' + codigo + ' registrada correctamente.');
    }

    try {
      window.history.replaceState({}, '', window.location.pathname);
    } catch (e) { /* noop */ }
  });

  var editBtn = document.getElementById('profile-edit-btn');
  var form = document.getElementById('profile-form');
  var cancelBtn = document.getElementById('profile-cancel');
  var submitBtn = document.getElementById('profile-submit');
  var errorBox = document.getElementById('profile-error');
  var successBox = document.getElementById('profile-success');
  var inputNombre = document.getElementById('perfil-nombre');
  var inputApellidos = document.getElementById('perfil-apellidos');
  var inputCorreo = document.getElementById('perfil-correo');
  var inputPassword = document.getElementById('perfil-password');

  function limpiarPerfil() {
    if (errorBox) {
      errorBox.hidden = true;
      errorBox.textContent = '';
    }
  }

  function abrirPerfil() {
    if (!form) return;
    if (successBox) successBox.hidden = true;
    limpiarPerfil();
    if (inputNombre) inputNombre.value = usuario.nombre || '';
    if (inputApellidos) inputApellidos.value = usuario.apellidos || '';
    if (inputCorreo) inputCorreo.value = usuario.correo || '';
    if (inputPassword) inputPassword.value = '';
    form.hidden = false;
    if (editBtn) editBtn.hidden = true;
    if (inputNombre) inputNombre.focus();
  }

  function cerrarPerfil() {
    if (!form) return;
    form.hidden = true;
    if (editBtn) editBtn.hidden = false;
  }

  if (editBtn) editBtn.addEventListener('click', abrirPerfil);
  if (cancelBtn) cancelBtn.addEventListener('click', cerrarPerfil);

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      limpiarPerfil();

      var nombre = inputNombre ? inputNombre.value.trim() : '';
      var apellidos = inputApellidos ? inputApellidos.value.trim() : '';
      var correo = inputCorreo ? inputCorreo.value.trim() : '';

      if (!nombre || !apellidos || !correo) {
        if (errorBox) {
          errorBox.hidden = false;
          errorBox.textContent = 'Nombre, apellidos y correo son obligatorios.';
        }
        return;
      }

      var cuerpo = {
        nombre: nombre,
        apellidos: apellidos,
        correo: correo,
        password: inputPassword ? inputPassword.value : ''
      };

      if (submitBtn) submitBtn.disabled = true;

      fetch(API_BASE + '/api/usuarios/' + usuario.idUsuario, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
      })
        .then(function (response) {
          if (!response.ok) {
            return response.text().then(function (texto) {
              throw new Error(texto || 'No se pudieron guardar los cambios.');
            });
          }
          return response.json();
        })
        .then(function (actualizado) {
          usuario = actualizado;
          guardarUsuario(actualizado);

          if (hero) hero.textContent = actualizado.nombre || 'huésped';
          if (perfilNombre) perfilNombre.textContent = (actualizado.nombre || '') + ' ' + (actualizado.apellidos || '');
          if (perfilCorreo) perfilCorreo.textContent = actualizado.correo || '';

          cerrarPerfil();
          if (successBox) {
            successBox.textContent = 'Datos actualizados correctamente.';
            successBox.hidden = false;
          }
        })
        .catch(function (error) {
          if (errorBox) {
            errorBox.hidden = false;
            errorBox.textContent = error.message || 'No se pudieron guardar los cambios.';
          }
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }
})();
