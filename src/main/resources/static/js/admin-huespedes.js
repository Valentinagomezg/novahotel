(function () {
  var admin = window.NovaAdmin;
  if (!admin) return;

  var API = admin.apiBase;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  var state = { huespedes: [], filtro: 'Todos', texto: '', rol: 'Todos', orden: 'reciente' };

  var tbody = document.getElementById('huespedes-tbody');
  var tableWrap = document.getElementById('huespedes-table-wrap');
  var emptyBox = document.getElementById('huespedes-empty');
  var countBox = document.getElementById('huespedes-count');
  var searchToolbar = document.getElementById('huespedes-search');
  var searchTop = document.getElementById('admin-top-search');
  var rolSelect = document.getElementById('huespedes-rol');
  var ordenSelect = document.getElementById('huespedes-orden');
  var exportBtn = document.getElementById('huespedes-export');
  var tabs = document.querySelectorAll('.admin-tabs a[data-filtro]');

  var statTotal = document.getElementById('huespedes-total');
  var statActivos = document.getElementById('huespedes-activos');
  var statFrecuentes = document.getElementById('huespedes-frecuentes');
  var statGastado = document.getElementById('huespedes-gastado');

  var modal = document.getElementById('huespede-modal');
  var modalTitle = document.getElementById('huespede-modal-title');
  var modalSubtitle = document.getElementById('huespede-modal-subtitle');
  var modalBody = document.getElementById('huespede-modal-body');

  var ICONS = {
    mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 6l-10 7L2 6',
    phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
    pin: 'M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    hash: 'M4 9h16 M4 15h16 M10 3 8 21 M16 3l-2 18',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    calendar: 'M3 5h18v16H3z M8 2v4 M16 2v4 M3 10h18',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    check: 'M20 6L9 17l-5-5',
    coin: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    arrow: 'M5 12h14 M12 5l7 7-7 7'
  };

  function el(tag, clase, texto) {
    var nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
  }

  function icono(d, tamano) {
    var size = tamano || 14;
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
    return svg;
  }

  function eur(valor) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(Number(valor) || 0);
  }

  function formatoFechaHora(valor) {
    if (!valor) return '—';
    var fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return valor;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(fecha);
  }

  function formatoFechaCorta(valor) {
    if (!valor) return '—';
    var fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return valor;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).format(fecha);
  }

  function fechaMs(valor) {
    if (!valor) return 0;
    var fecha = new Date(valor);
    return isNaN(fecha.getTime()) ? 0 : fecha.getTime();
  }

  function iniciales(nombre, apellidos) {
    var partes = [nombre, apellidos].join(' ').trim().split(/\s+/).slice(0, 2);
    return partes
      .map(function (parte) { return parte.charAt(0); })
      .join('')
      .toUpperCase() || 'NA';
  }

  function norm(valor) {
    return String(valor === undefined || valor === null ? '' : valor).toLowerCase();
  }

  function nombreCompleto(huesped) {
    return [huesped.nombre, huesped.apellidos].filter(Boolean).join(' ') || 'Huésped';
  }

  function varianteAvatar(huesped) {
    if (norm(huesped.rol) === 'administrador') return 'admin';
    if ((huesped.totalReservas || 0) >= 2) return 'vip';
    if ((huesped.reservasActivas || 0) > 0) return 'active';
    return 'default';
  }

  function filtradas() {
    return state.huespedes.filter(function (huesped) {
      if (state.filtro === 'En estancia' && !(huesped.reservasActivas > 0)) return false;
      if (state.filtro === 'Frecuentes' && !(huesped.totalReservas >= 2)) return false;
      if (state.filtro === 'Administradores' && norm(huesped.rol) !== 'administrador') return false;
      if (state.rol !== 'Todos' && norm(huesped.rol) !== norm(state.rol)) return false;
      if (state.texto) {
        var blob = [
          huesped.idUsuario, huesped.nombre, huesped.apellidos, huesped.correo,
          huesped.telefono, huesped.pais, huesped.ciudad, huesped.rol
        ].join(' ').toLowerCase();
        if (blob.indexOf(state.texto) === -1) return false;
      }
      return true;
    });
  }

  function ordenar(lista) {
    var copia = lista.slice();
    switch (state.orden) {
      case 'nombre':
        copia.sort(function (a, b) {
          return nombreCompleto(a).localeCompare(nombreCompleto(b), 'es', { sensitivity: 'base' });
        });
        break;
      case 'gasto':
        copia.sort(function (a, b) {
          return (Number(b.totalGastado) || 0) - (Number(a.totalGastado) || 0);
        });
        break;
      case 'reservas':
        copia.sort(function (a, b) {
          return (b.totalReservas || 0) - (a.totalReservas || 0);
        });
        break;
      default:
        copia.sort(function (a, b) {
          return fechaMs(b.fechaRegistro) - fechaMs(a.fechaRegistro);
        });
    }
    return copia;
  }

  function listaVisible() {
    return ordenar(filtradas());
  }

  function calcularStats() {
    var total = state.huespedes.length;
    var activos = state.huespedes.filter(function (h) { return h.reservasActivas > 0; }).length;
    var frecuentes = state.huespedes.filter(function (h) { return h.totalReservas >= 2; }).length;
    var gastado = state.huespedes.reduce(function (suma, h) {
      return suma + (Number(h.totalGastado) || 0);
    }, 0);

    if (statTotal) statTotal.textContent = total;
    if (statActivos) statActivos.textContent = activos;
    if (statFrecuentes) statFrecuentes.textContent = frecuentes;
    if (statGastado) statGastado.textContent = eur(gastado);
  }

  function actualizarContadores() {
    var totales = {
      Todos: state.huespedes.length,
      'En estancia': 0,
      Frecuentes: 0,
      Administradores: 0
    };

    state.huespedes.forEach(function (huesped) {
      if (huesped.reservasActivas > 0) totales['En estancia'] += 1;
      if (huesped.totalReservas >= 2) totales.Frecuentes += 1;
      if (norm(huesped.rol) === 'administrador') totales.Administradores += 1;
    });

    Array.prototype.forEach.call(tabs, function (tab) {
      var clave = tab.getAttribute('data-filtro');
      var contador = tab.querySelector('[data-count]');
      if (contador) contador.textContent = totales[clave] || 0;
    });
  }

  function crearAvatar(huesped, claseBase) {
    return el('span', claseBase + ' ' + claseBase + '--' + varianteAvatar(huesped), iniciales(huesped.nombre, huesped.apellidos));
  }

  function lineaContacto(iconPath, texto) {
    var fila = el('span', null, texto);
    fila.insertBefore(icono(iconPath, 13), fila.firstChild);
    return fila;
  }

  function estadoHuesped(huesped) {
    if (norm(huesped.rol) === 'administrador') return { clase: 'badge--admin', texto: 'Administrador' };
    if ((huesped.reservasActivas || 0) > 0) return { clase: 'badge--confirmed', texto: 'En estancia' };
    if ((huesped.totalReservas || 0) >= 2) return { clase: 'badge--vip', texto: 'Frecuente' };
    return null;
  }

  function crearBotonVer(huesped) {
    var boton = el('button', 'btn-admin btn-admin--ghost btn-admin--sm guest-table__cta');
    boton.type = 'button';
    boton.setAttribute('aria-label', 'Ver ficha de ' + nombreCompleto(huesped));
    boton.appendChild(document.createTextNode('Ver ficha'));
    boton.appendChild(icono(ICONS.arrow, 14));
    boton.addEventListener('click', function () { abrirDetalle(huesped); });
    return boton;
  }

  function celdaHuesped(huesped) {
    var td = el('td');
    var celda = el('div', 'guest-cell');
    celda.appendChild(crearAvatar(huesped, 'guest-cell__avatar'));

    var info = el('div', 'guest-cell__info');
    info.appendChild(el('strong', null, nombreCompleto(huesped)));
    info.appendChild(el('span', 'guest-cell__email', huesped.correo || 'Sin correo'));
    celda.appendChild(info);

    td.appendChild(celda);
    return td;
  }

  function celdaContacto(huesped) {
    var td = el('td');
    var contacto = el('div', 'guest-table__contact');
    contacto.appendChild(lineaContacto(ICONS.phone, huesped.telefono || 'Sin teléfono'));
    contacto.appendChild(lineaContacto(ICONS.pin, [huesped.ciudad, huesped.pais].filter(Boolean).join(', ') || 'Sin ubicación'));
    td.appendChild(contacto);
    return td;
  }

  function celdaReservas(huesped) {
    var td = el('td');
    var stack = el('div', 'cell-stack');
    var total = huesped.totalReservas || 0;
    stack.appendChild(el('strong', null, total + (total === 1 ? ' reserva' : ' reservas')));
    var activas = huesped.reservasActivas || 0;
    stack.appendChild(el('span', null, activas + (activas === 1 ? ' activa' : ' activas')));
    td.appendChild(stack);
    return td;
  }

  function crearFila(huesped) {
    var tr = el('tr');

    tr.appendChild(celdaHuesped(huesped));
    tr.appendChild(celdaContacto(huesped));
    tr.appendChild(celdaReservas(huesped));

    var tdGasto = el('td');
    tdGasto.appendChild(el('strong', 'cell-total', eur(huesped.totalGastado)));
    tr.appendChild(tdGasto);

    var tdUltima = el('td');
    tdUltima.appendChild(el('span', 'cell-muted', formatoFechaCorta(huesped.ultimaReserva)));
    tr.appendChild(tdUltima);

    var tdEstado = el('td');
    var estado = estadoHuesped(huesped);
    if (estado) {
      tdEstado.appendChild(el('span', 'badge ' + estado.clase, estado.texto));
    } else {
      tdEstado.appendChild(el('span', 'cell-muted', 'Sin reservas'));
    }
    tr.appendChild(tdEstado);

    var tdAccion = el('td');
    tdAccion.appendChild(crearBotonVer(huesped));
    tr.appendChild(tdAccion);

    return tr;
  }

  function mostrarVacio(titulo, texto, mostrarEnlace) {
    if (!emptyBox) return;
    emptyBox.hidden = false;
    var h = emptyBox.querySelector('strong');
    var p = emptyBox.querySelector('p');
    var enlace = emptyBox.querySelector('a');
    if (h) h.textContent = titulo;
    if (p) p.textContent = texto;
    if (enlace) enlace.hidden = !mostrarEnlace;
  }

  function render() {
    var lista = listaVisible();

    if (tbody) {
      tbody.textContent = '';
      lista.forEach(function (huesped) {
        tbody.appendChild(crearFila(huesped));
      });
    }
    if (tableWrap) {
      tableWrap.hidden = lista.length === 0;
    }
    if (emptyBox) {
      emptyBox.hidden = lista.length !== 0;
      if (lista.length === 0) {
        if (state.huespedes.length === 0) {
          mostrarVacio('No hay huéspedes registrados', 'Los huéspedes que se registren aparecerán aquí.', true);
        } else {
          mostrarVacio('Sin resultados', 'No hay huéspedes que coincidan con los filtros aplicados.', false);
        }
      }
    }

    if (countBox) {
      countBox.textContent = lista.length + ' de ' + state.huespedes.length +
        (state.huespedes.length === 1 ? ' huésped' : ' huéspedes');
    }

    calcularStats();
    actualizarContadores();
  }

  function miniStat(etiqueta, valor, iconoPath, variante) {
    var caja = el('div', 'guest-stat' + (variante ? ' guest-stat--' + variante : ''));
    var top = el('div', 'guest-stat__top');
    top.appendChild(el('span', 'guest-stat__label', etiqueta));
    var cajaIcono = el('span', 'guest-stat__icon');
    cajaIcono.appendChild(icono(iconoPath, 15));
    top.appendChild(cajaIcono);
    caja.appendChild(top);
    caja.appendChild(el('strong', 'guest-stat__value', valor));
    return caja;
  }

  function seccionPerfil(titulo, filas) {
    var caja = el('section', 'guest-section');
    caja.appendChild(el('h4', 'guest-section__title', titulo));
    var lista = el('div', 'guest-section__list');

    filas.forEach(function (fila) {
      var item = el('div', 'guest-info');
      var cajaIcono = el('span', 'guest-info__icon');
      cajaIcono.appendChild(icono(fila.icon, 15));
      item.appendChild(cajaIcono);

      var texto = el('span', 'guest-info__text');
      texto.appendChild(el('span', 'guest-info__label', fila.label));
      texto.appendChild(el(fila.strong ? 'strong' : 'span', 'guest-info__value', fila.value));
      item.appendChild(texto);

      lista.appendChild(item);
    });

    caja.appendChild(lista);
    return caja;
  }

  function construirPerfil(huesped) {
    var esAdmin = norm(huesped.rol) === 'administrador';
    var ubicacion = [huesped.ciudad, huesped.pais].filter(Boolean).join(', ') || '—';
    var perfil = el('div', 'guest-profile');

    var hero = el('div', 'guest-profile__hero');
    var avatar = el('div', 'guest-profile__avatar guest-profile__avatar--' + varianteAvatar(huesped));
    avatar.appendChild(el('span', null, iniciales(huesped.nombre, huesped.apellidos)));
    hero.appendChild(avatar);

    var ident = el('div', 'guest-profile__ident');
    var filaNombre = el('div', 'guest-profile__row');
    filaNombre.appendChild(el('h3', 'guest-profile__name', nombreCompleto(huesped)));
    filaNombre.appendChild(el('span', 'badge ' + (esAdmin ? 'badge--admin' : 'badge--usuario'), huesped.rol || 'Usuario'));
    ident.appendChild(filaNombre);
    ident.appendChild(el('p', 'guest-profile__email', huesped.correo || 'Sin correo'));

    var flags = el('div', 'guest-profile__flags');
    flags.appendChild(el('span', 'guest-flag guest-flag--id', 'ID #' + huesped.idUsuario));
    if ((huesped.reservasActivas || 0) > 0) {
      flags.appendChild(el('span', 'guest-flag guest-flag--active', 'En estancia'));
    }
    if ((huesped.totalReservas || 0) >= 2) {
      flags.appendChild(el('span', 'guest-flag guest-flag--vip', 'Huésped frecuente'));
    }
    ident.appendChild(flags);

    hero.appendChild(ident);
    perfil.appendChild(hero);

    var stats = el('div', 'guest-stats');
    stats.appendChild(miniStat('Reservas', String(huesped.totalReservas || 0), ICONS.users, 'gold'));
    stats.appendChild(miniStat('Activas', String(huesped.reservasActivas || 0), ICONS.check, 'green'));
    stats.appendChild(miniStat('Gastado', eur(huesped.totalGastado), ICONS.coin, 'blue'));
    stats.appendChild(miniStat('Última reserva', formatoFechaCorta(huesped.ultimaReserva), ICONS.clock, 'muted'));
    perfil.appendChild(stats);

    var columnas = el('div', 'guest-profile__cols');
    columnas.appendChild(seccionPerfil('Datos de contacto', [
      { icon: ICONS.mail, label: 'Correo electrónico', value: huesped.correo || '—', strong: true },
      { icon: ICONS.phone, label: 'Teléfono', value: huesped.telefono || '—' },
      { icon: ICONS.pin, label: 'Ubicación', value: ubicacion }
    ]));

    columnas.appendChild(seccionPerfil('Cuenta de huésped', [
      { icon: ICONS.hash, label: 'ID de usuario', value: huesped.idUsuario },
      { icon: ICONS.shield, label: 'Rol', value: huesped.rol || 'Usuario' },
      { icon: ICONS.calendar, label: 'Registrado', value: formatoFechaHora(huesped.fechaRegistro) },
      { icon: ICONS.clock, label: 'Última reserva', value: formatoFechaHora(huesped.ultimaReserva) }
    ]));
    perfil.appendChild(columnas);

    var enlaceReservas = el('a', 'guest-profile__link');
    enlaceReservas.href = 'reservas.html?buscar=' + encodeURIComponent(huesped.correo || nombreCompleto(huesped));
    enlaceReservas.appendChild(document.createTextNode('Ver reservas de este huésped'));
    enlaceReservas.appendChild(icono(ICONS.arrow, 15));
    perfil.appendChild(enlaceReservas);

    return perfil;
  }

  function abrirDetalle(huesped) {
    if (!modal) return;

    if (modalTitle) modalTitle.textContent = nombreCompleto(huesped);
    if (modalSubtitle) modalSubtitle.textContent = [huesped.ciudad, huesped.pais].filter(Boolean).join(', ') || (huesped.correo || 'Sin correo');

    if (modalBody) {
      modalBody.textContent = '';
      modalBody.appendChild(construirPerfil(huesped));
    }

    modal.hidden = false;
    document.body.classList.add('no-scroll');

    var cerrar = modal.querySelector('.admin-modal__head .icon-btn');
    if (cerrar) cerrar.focus({ preventScroll: true });
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
      state.filtro = tab.getAttribute('data-filtro');
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
  if (rolSelect) {
    rolSelect.addEventListener('change', function () {
      state.rol = rolSelect.value;
      render();
    });
  }
  if (ordenSelect) {
    ordenSelect.addEventListener('change', function () {
      state.orden = ordenSelect.value;
      render();
    });
  }

  function escaparCsv(valor) {
    var texto = String(valor === undefined || valor === null ? '' : valor);
    return '"' + texto.replace(/"/g, '""') + '"';
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      var lista = listaVisible();
      var cabeceras = [
        'ID', 'Nombre', 'Apellidos', 'Correo', 'Telefono', 'Pais', 'Ciudad', 'Rol',
        'Registro', 'Reservas totales', 'Reservas activas', 'Total gastado', 'Ultima reserva'
      ];
      var lineas = [cabeceras.map(escaparCsv).join(';')];
      lista.forEach(function (huesped) {
        lineas.push([
          huesped.idUsuario, huesped.nombre, huesped.apellidos, huesped.correo,
          huesped.telefono, huesped.pais, huesped.ciudad, huesped.rol,
          formatoFechaHora(huesped.fechaRegistro), huesped.totalReservas,
          huesped.reservasActivas, huesped.totalGastado, formatoFechaHora(huesped.ultimaReserva)
        ].map(escaparCsv).join(';'));
      });

      var blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'huespedes-novahotel-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);
    });
  }

  if (emptyBox) {
    mostrarVacio('Cargando huéspedes...', 'Estamos consultando los huéspedes registrados.', false);
    var enlace = emptyBox.querySelector('a');
    if (enlace) enlace.hidden = true;
  }
  if (countBox) countBox.textContent = 'Cargando huéspedes...';

  fetch(API + '/api/usuarios')
    .then(function (response) {
      if (!response.ok) throw new Error('No se pudieron cargar los huéspedes.');
      return response.json();
    })
    .then(function (huespedes) {
      state.huespedes = Array.isArray(huespedes) ? huespedes : [];
      render();
    })
    .catch(function (error) {
      if (tableWrap) tableWrap.hidden = true;
      mostrarVacio('No se pudieron cargar los huéspedes', error.message || 'Intenta de nuevo más tarde.', false);
      if (countBox) countBox.textContent = 'Error al cargar';
    });
})();
