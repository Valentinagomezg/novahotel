(function () {
  var admin = window.NovaAdmin;
  if (!admin) return;

  var API = admin.apiBase;
  var state = { habitaciones: [], filtro: 'Todas', texto: '', tipo: 'Todos', planta: 'Todas' };

  var grid = document.getElementById('habitaciones-grid');
  var emptyBox = document.getElementById('habitaciones-empty');
  var countBox = document.getElementById('habitaciones-count');
  var searchToolbar = document.getElementById('habitaciones-search');
  var searchTop = document.getElementById('admin-top-search');
  var tipoSelect = document.getElementById('habitaciones-tipo');
  var plantaSelect = document.getElementById('habitaciones-planta');
  var exportBtn = document.getElementById('habitaciones-export');
  var nuevaBtn = document.getElementById('habitaciones-nueva');
  var tabs = document.querySelectorAll('.admin-tabs a[data-estado]');

  var statTotal = document.getElementById('habitaciones-total');
  var statDisponibles = document.getElementById('habitaciones-disponibles');
  var statOcupadas = document.getElementById('habitaciones-ocupadas');
  var statFuera = document.getElementById('habitaciones-fuera');

  var modal = document.getElementById('habitacion-modal');
  var form = document.getElementById('habitacion-form');
  var formError = document.getElementById('habitacion-form-error');
  var inputNumero = document.getElementById('habitacion-numero');
  var inputTipo = document.getElementById('habitacion-tipo');
  var inputPlanta = document.getElementById('habitacion-planta');
  var inputCapacidad = document.getElementById('habitacion-capacidad');
  var inputPrecio = document.getElementById('habitacion-precio');
  var inputEstado = document.getElementById('habitacion-estado');
  var submitBtn = document.getElementById('habitacion-submit');

  var TIPOS = { clasica: 'Clásica', deluxe: 'Deluxe', nova: 'Suite Nova' };
  var ESTADOS = ['Disponible', 'Limpieza', 'Mantenimiento'];

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

  function norm(valor) {
    return String(valor === undefined || valor === null ? '' : valor).toLowerCase();
  }

  function etiquetaTipo(tipo) {
    return TIPOS[norm(tipo)] || tipo || '—';
  }

  function disponible(habitacion) {
    return !habitacion.ocupadaHoy && habitacion.estado === 'Disponible';
  }

  function filtradas() {
    return state.habitaciones.filter(function (habitacion) {
      if (state.filtro === 'Disponibles' && !disponible(habitacion)) return false;
      if (state.filtro === 'Ocupadas' && !habitacion.ocupadaHoy) return false;
      if (state.filtro === 'Limpieza' && habitacion.estado !== 'Limpieza') return false;
      if (state.filtro === 'Mantenimiento' && habitacion.estado !== 'Mantenimiento') return false;
      if (state.tipo !== 'Todos' && norm(habitacion.tipo) !== state.tipo) return false;
      if (state.planta !== 'Todas' && String(habitacion.planta) !== state.planta) return false;
      if (state.texto) {
        var blob = [
          habitacion.numero, habitacion.tipo, habitacion.planta,
          habitacion.capacidad, habitacion.estado
        ].join(' ').toLowerCase();
        if (blob.indexOf(state.texto) === -1) return false;
      }
      return true;
    });
  }

  function calcularStats() {
    var total = state.habitaciones.length;
    var disp = state.habitaciones.filter(disponible).length;
    var ocupadas = state.habitaciones.filter(function (h) { return h.ocupadaHoy; }).length;
    var fuera = state.habitaciones.filter(function (h) {
      return h.estado === 'Limpieza' || h.estado === 'Mantenimiento';
    }).length;

    if (statTotal) statTotal.textContent = total;
    if (statDisponibles) statDisponibles.textContent = disp;
    if (statOcupadas) statOcupadas.textContent = ocupadas;
    if (statFuera) statFuera.textContent = fuera;
  }

  function actualizarContadores() {
    var totales = {
      Todas: state.habitaciones.length,
      Disponibles: 0,
      Ocupadas: 0,
      Limpieza: 0,
      Mantenimiento: 0
    };

    state.habitaciones.forEach(function (habitacion) {
      if (disponible(habitacion)) totales.Disponibles += 1;
      if (habitacion.ocupadaHoy) totales.Ocupadas += 1;
      if (habitacion.estado === 'Limpieza') totales.Limpieza += 1;
      if (habitacion.estado === 'Mantenimiento') totales.Mantenimiento += 1;
    });

    Array.prototype.forEach.call(tabs, function (tab) {
      var clave = tab.getAttribute('data-estado');
      var contador = tab.querySelector('[data-count]');
      if (contador) contador.textContent = totales[clave] || 0;
    });
  }

  function claseEstado(habitacion) {
    if (habitacion.ocupadaHoy) return 'badge--checkedin';
    if (habitacion.estado === 'Limpieza') return 'badge--confirmed';
    if (habitacion.estado === 'Mantenimiento') return 'badge--cancelled';
    return 'badge--pending';
  }

  function textoEstado(habitacion) {
    if (habitacion.ocupadaHoy) return 'Ocupada';
    return habitacion.estado || 'Disponible';
  }

  function crearTile(habitacion) {
    var tile = el('article', 'room-tile');

    var mediaClase = 'room-tile__media';
    if (norm(habitacion.tipo) === 'deluxe') mediaClase += ' room-tile__media--gold';
    if (norm(habitacion.tipo) === 'nova') mediaClase += ' room-tile__media--green';

    var media = el('div', mediaClase);
    media.appendChild(el('span', 'badge ' + claseEstado(habitacion), textoEstado(habitacion)));
    media.appendChild(el('span', 'room-tile__number', 'Nº ' + habitacion.numero));
    tile.appendChild(media);

    var body = el('div', 'room-tile__body');
    body.appendChild(el('h3', null, etiquetaTipo(habitacion.tipo)));
    body.appendChild(el('p', null, 'Planta ' + habitacion.planta + ' · Capacidad ' + habitacion.capacidad + ' personas'));

    var meta = el('div', 'room-tile__meta');
    meta.appendChild(el('span', null, 'ID #' + habitacion.idHabitacion));
    meta.appendChild(el('span', null, habitacion.capacidad + ' huéspedes'));
    body.appendChild(meta);

    var foot = el('div', 'room-tile__foot');
    var precio = el('div');
    precio.appendChild(el('strong', null, eur(habitacion.precioNoche)));
    precio.appendChild(el('span', null, ' por noche'));
    foot.appendChild(precio);

    var selector = el('select', 'select select--sm');
    ESTADOS.forEach(function (estado) {
      var opcion = el('option', null, estado);
      opcion.value = estado;
      selector.appendChild(opcion);
    });
    selector.value = ESTADOS.indexOf(habitacion.estado) !== -1 ? habitacion.estado : 'Disponible';
    selector.addEventListener('change', function () {
      cambiarEstado(habitacion, selector.value, selector);
    });
    foot.appendChild(selector);

    body.appendChild(foot);
    tile.appendChild(body);

    return tile;
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

    if (grid) {
      grid.textContent = '';
      lista.forEach(function (habitacion) {
        grid.appendChild(crearTile(habitacion));
      });
    }

    if (grid) grid.hidden = lista.length === 0;
    if (emptyBox) {
      emptyBox.hidden = lista.length !== 0;
      if (lista.length === 0) {
        if (state.habitaciones.length === 0) {
          mostrarVacio('No hay habitaciones registradas', 'Añade la primera habitación para empezar a gestionar el hotel.');
        } else {
          mostrarVacio('Sin resultados', 'No hay habitaciones que coincidan con los filtros aplicados.');
        }
      }
    }

    if (countBox) {
      countBox.textContent = lista.length + ' de ' + state.habitaciones.length +
        (state.habitaciones.length === 1 ? ' habitación' : ' habitaciones');
    }

    calcularStats();
    actualizarContadores();
  }

  function cambiarEstado(habitacion, estado, control) {
    if (control) control.disabled = true;

    fetch(API + '/api/habitaciones/' + habitacion.idHabitacion + '/estado', {
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
        var indice = state.habitaciones.findIndex(function (item) {
          return item.idHabitacion === actualizada.idHabitacion;
        });
        if (indice !== -1) state.habitaciones[indice] = actualizada;
        render();
        if (window.showAdminToast) {
          window.showAdminToast('Habitación ' + actualizada.numero + ' marcada como ' + actualizada.estado + '.', 'success');
        }
      })
      .catch(function (error) {
        if (window.showAdminToast) {
          window.showAdminToast(error.message || 'No se pudo actualizar el estado.', 'error');
        } else {
          window.alert(error.message || 'No se pudo actualizar el estado.');
        }
        if (control) {
          control.value = habitacion.estado;
          control.disabled = false;
        }
      });
  }

  function abrirModal() {
    if (!modal) return;
    if (form) form.reset();
    if (formError) {
      formError.hidden = true;
      formError.textContent = '';
    }
    if (inputEstado) inputEstado.value = 'Disponible';
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    if (inputNumero) inputNumero.focus();
  }

  function cerrarModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
  }

  if (modal) {
    Array.prototype.forEach.call(modal.querySelectorAll('[data-close-modal]'), function (boton) {
      boton.addEventListener('click', cerrarModal);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) cerrarModal();
    });
  }

  if (nuevaBtn) nuevaBtn.addEventListener('click', abrirModal);
  var emptyLink = emptyBox ? emptyBox.querySelector('a') : null;
  if (emptyLink) {
    emptyLink.addEventListener('click', function (event) {
      event.preventDefault();
      abrirModal();
    });
  }

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var numero = inputNumero ? inputNumero.value.trim() : '';
      if (!numero) {
        if (formError) {
          formError.hidden = false;
          formError.textContent = 'El número de habitación es obligatorio.';
        }
        return;
      }

      var cuerpo = {
        numero: numero,
        tipo: inputTipo ? inputTipo.value : 'clasica',
        planta: inputPlanta ? Number(inputPlanta.value) : 1,
        capacidad: inputCapacidad ? Number(inputCapacidad.value) : 2,
        precioNoche: inputPrecio && inputPrecio.value ? Number(inputPrecio.value) : null,
        estado: inputEstado ? inputEstado.value : 'Disponible'
      };

      if (submitBtn) submitBtn.disabled = true;

      fetch(API + '/api/habitaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
      })
        .then(function (response) {
          if (!response.ok) {
            return response.text().then(function (texto) {
              throw new Error(texto || 'No se pudo crear la habitación.');
            });
          }
          return response.json();
        })
        .then(function (creada) {
          state.habitaciones.push(creada);
          state.habitaciones.sort(function (a, b) {
            return String(a.numero).localeCompare(String(b.numero), 'es', { numeric: true });
          });
          render();
          cerrarModal();
          if (window.showAdminToast) {
            window.showAdminToast('Habitación ' + creada.numero + ' creada correctamente.', 'success');
          }
        })
        .catch(function (error) {
          if (formError) {
            formError.hidden = false;
            formError.textContent = error.message || 'No se pudo crear la habitación.';
          }
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  Array.prototype.forEach.call(tabs, function (tab) {
    tab.addEventListener('click', function (event) {
      event.preventDefault();
      Array.prototype.forEach.call(tabs, function (otro) { otro.classList.remove('is-active'); });
      tab.classList.add('is-active');
      state.filtro = tab.getAttribute('data-estado');
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
  if (tipoSelect) {
    tipoSelect.addEventListener('change', function () {
      state.tipo = tipoSelect.value;
      render();
    });
  }
  if (plantaSelect) {
    plantaSelect.addEventListener('change', function () {
      state.planta = plantaSelect.value;
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
        'ID', 'Numero', 'Tipo', 'Planta', 'Capacidad', 'Precio noche', 'Estado', 'Ocupada hoy'
      ];
      var lineas = [cabeceras.map(escaparCsv).join(';')];
      lista.forEach(function (habitacion) {
        lineas.push([
          habitacion.idHabitacion, habitacion.numero, etiquetaTipo(habitacion.tipo),
          habitacion.planta, habitacion.capacidad, habitacion.precioNoche,
          habitacion.estado, habitacion.ocupadaHoy ? 'Sí' : 'No'
        ].map(escaparCsv).join(';'));
      });

      var blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'habitaciones-novahotel-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);
    });
  }

  if (emptyBox) {
    mostrarVacio('Cargando habitaciones...', 'Estamos consultando el estado de las habitaciones.');
    var enlace = emptyBox.querySelector('a');
    if (enlace) enlace.hidden = true;
  }
  if (countBox) countBox.textContent = 'Cargando habitaciones...';

  fetch(API + '/api/habitaciones')
    .then(function (response) {
      if (!response.ok) throw new Error('No se pudieron cargar las habitaciones.');
      return response.json();
    })
    .then(function (habitaciones) {
      state.habitaciones = Array.isArray(habitaciones) ? habitaciones : [];
      render();
    })
    .catch(function (error) {
      if (grid) grid.hidden = true;
      mostrarVacio('No se pudieron cargar las habitaciones', error.message || 'Intenta de nuevo más tarde.');
      if (countBox) countBox.textContent = 'Error al cargar';
    });
})();
