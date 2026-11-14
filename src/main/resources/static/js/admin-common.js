(function () {
  var USER_KEY = 'novaUsuario';
  var ROL_KEY = 'novaRol';

  function esAdmin(usuario) {
    return !!usuario && String(usuario.rol || '').trim().toLowerCase() === 'administrador';
  }

  function leerUsuario() {
    var raw = null;

    try {
      raw = sessionStorage.getItem(USER_KEY);
    } catch (e) {
      /* sessionStorage no disponible */
    }

    if (!raw) {
      try {
        raw = localStorage.getItem(USER_KEY);
      } catch (e) {
        /* localStorage no disponible */
      }
    }

    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  var usuario = leerUsuario();

  if (!esAdmin(usuario)) {
    window.location.replace('../login.html');
    return;
  }

  window.NovaAdmin = {
    usuario: usuario,
    apiBase: (window.location.port === '8080') ? '' : 'http://localhost:8080'
  };

  window.showAdminToast = function (mensaje, tipo) {
    if (!mensaje) return;

    var stack = document.getElementById('admin-toasts');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'admin-toasts';
      stack.className = 'admin-toast-stack';
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }

    var toast = document.createElement('div');
    toast.className = 'admin-toast' + (tipo === 'error' ? ' admin-toast--error' : tipo === 'success' ? ' admin-toast--success' : '');
    toast.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    toast.textContent = mensaje;
    stack.appendChild(toast);

    window.setTimeout(function () {
      toast.classList.add('is-out');
      window.setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 4200);
  };

  var nombreCompleto = ((usuario.nombre || '') + ' ' + (usuario.apellidos || '')).trim();
  var iniciales = ((usuario.nombre || 'A').charAt(0) + (usuario.apellidos || '').charAt(0)).toUpperCase();

  var sidebarUser = document.querySelector('.sidebar__user');
  if (sidebarUser) {
    var nombre = sidebarUser.querySelector('strong');
    var detalle = sidebarUser.querySelector('span:not(.sidebar__avatar)');
    var avatar = sidebarUser.querySelector('.sidebar__avatar');
    if (nombre) nombre.textContent = nombreCompleto || 'Administrador';
    if (detalle) detalle.textContent = usuario.correo || 'Administrador';
    if (avatar) avatar.textContent = iniciales || 'AD';
  }

  var salir = document.querySelectorAll('a[href="../login.html"]');
  Array.prototype.forEach.call(salir, function (enlace) {
    enlace.addEventListener('click', function () {
      try {
        sessionStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(ROL_KEY);
      } catch (e) {
        /* noop */
      }

      try {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(ROL_KEY);
      } catch (e) {
        /* noop */
      }
    });
  });
})();
