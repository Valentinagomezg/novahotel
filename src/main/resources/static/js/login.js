(function () {
  var API_BASE = (window.location.port === '8080') ? '' : 'http://localhost:8080';

  var USER_KEY = 'novaUsuario';

  var hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash === 'registro' || hash === 'register') {
    var registroRadio = document.getElementById('auth-registro');
    if (registroRadio) registroRadio.checked = true;
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-password-toggle]'), function (button) {
    button.addEventListener('click', function () {
      var field = button.closest('.field--float');
      var input = field ? field.querySelector('input') : null;
      if (!input) return;

      var visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      button.setAttribute('aria-pressed', visible ? 'true' : 'false');
      button.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
      input.focus({ preventScroll: true });
    });
  });

  function esAdmin(usuario) {
    return !!usuario && String(usuario.rol || '').trim().toLowerCase() === 'administrador';
  }

  function guardarUsuario(usuario) {
    var raw = JSON.stringify(usuario);
    var rol = esAdmin(usuario) ? 'Administrador' : 'Usuario';
    var guardado = false;

    try {
      sessionStorage.setItem(USER_KEY, raw);
      sessionStorage.setItem('novaRol', rol);
      guardado = true;
    } catch (e) {
      /* sessionStorage no disponible */
    }

    try {
      localStorage.setItem(USER_KEY, raw);
      localStorage.setItem('novaRol', rol);
      guardado = true;
    } catch (e) {
      /* localStorage no disponible */
    }

    return guardado;
  }

  function limpiarError(box) {
    if (!box) return;
    box.textContent = '';
    box.hidden = true;
  }

  function mostrarError(box, mensaje) {
    if (!box) {
      window.alert(mensaje);
      return;
    }
    box.textContent = mensaje;
    box.hidden = false;
  }

  function leerError(response, porDefecto) {
    return response.text().then(function (texto) {
      throw new Error(texto || porDefecto);
    });
  }

  function redirigir(usuario) {
    if (esAdmin(usuario)) {
      window.location.href = 'admin/dashboard.html';
    } else {
      window.location.href = 'cuenta.html';
    }
  }

  function entrar(usuario, box) {
    if (!guardarUsuario(usuario)) {
      mostrarError(box, 'Tu navegador está bloqueando el almacenamiento local. Actívalo o usa otro navegador para iniciar sesión.');
      return false;
    }
    redirigir(usuario);
    return true;
  }

  var loginForm = document.getElementById('login-form');
  var loginErrorBox = document.getElementById('login-error-login');
  var loginReenviarBtn = document.getElementById('login-reenviar');
  var loginReenvioEstado = document.getElementById('login-reenvio-estado');

  if (loginReenviarBtn) {
    loginReenviarBtn.addEventListener('click', function () {
      var emailInput = document.getElementById('email');
      var correo = emailInput ? emailInput.value.trim() : '';
      if (!correo) {
        mostrarError(loginErrorBox, 'Escribe tu correo electrónico para reenviar la confirmación.');
        return;
      }

      loginReenviarBtn.disabled = true;
      if (loginReenvioEstado) {
        loginReenvioEstado.hidden = false;
        loginReenvioEstado.textContent = 'Enviando un nuevo enlace...';
      }

      fetch(API_BASE + '/api/usuarios/reenviar-confirmacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correo })
      })
        .then(function (response) {
          if (!response.ok) {
            return leerError(response, 'No se pudo reenviar el correo.');
          }
          return response.json();
        })
        .then(function () {
          if (loginReenvioEstado) {
            loginReenvioEstado.textContent = 'Correo reenviado. Revisa tu bandeja de entrada y la carpeta de spam.';
          }
        })
        .catch(function (error) {
          if (loginReenvioEstado) {
            loginReenvioEstado.textContent = error.message || 'No se pudo reenviar el correo.';
          }
        })
        .finally(function () {
          loginReenviarBtn.disabled = false;
        });
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function (event) {
      event.preventDefault();
      limpiarError(loginErrorBox);
      if (loginReenviarBtn) loginReenviarBtn.hidden = true;
      if (loginReenvioEstado) loginReenvioEstado.hidden = true;

      var email = document.getElementById('email');
      var password = document.getElementById('password');
      var button = loginForm.querySelector('button[type="submit"]');

      if (button) button.disabled = true;

      fetch(API_BASE + '/api/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo: email.value.trim(),
          password: password.value
        })
      })
        .then(function (response) {
          if (!response.ok) {
            var noConfirmado = response.status === 403;
            return response.text().then(function (texto) {
              var error = new Error(texto || 'No se pudo iniciar sesión.');
              error.noConfirmado = noConfirmado;
              throw error;
            });
          }
          return response.json();
        })
        .then(function (usuario) {
          if (!entrar(usuario, loginErrorBox) && button) button.disabled = false;
        })
        .catch(function (error) {
          mostrarError(loginErrorBox, error.message || 'No se pudo conectar con el servidor.');
          if (error.noConfirmado && loginReenviarBtn) loginReenviarBtn.hidden = false;
          if (button) button.disabled = false;
        });
    });
  }

  var form = document.getElementById('register-form');
  if (!form) return;

  var usuarioRadio = document.getElementById('rol-usuario');
  var adminRadio = document.getElementById('rol-admin');
  var codeField = document.getElementById('admin-code');
  var codeInput = document.getElementById('codigo-admin');
  var errorBox = document.getElementById('login-error');
  var submitButton = form.querySelector('button[type="submit"]');

  var exitoBox = document.getElementById('registro-exito');
  var exitoCorreo = document.getElementById('registro-exito-correo');
  var reenvioEstado = document.getElementById('reenvio-estado');
  var reenviarBtn = document.getElementById('registro-reenviar');
  var irLoginBtn = document.getElementById('registro-ir-login');
  var ultimoCorreo = '';

  function correoRegistro() {
    var input = document.getElementById('email-registro');
    return input ? input.value.trim() : '';
  }

  function mostrarExitoRegistro(usuario) {
    ultimoCorreo = (usuario && usuario.correo) || correoRegistro();
    if (exitoCorreo) exitoCorreo.textContent = ultimoCorreo;
    if (reenvioEstado) {
      reenvioEstado.hidden = true;
      reenvioEstado.textContent = '';
    }
    if (form) form.hidden = true;
    if (exitoBox) exitoBox.hidden = false;
    if (submitButton) submitButton.disabled = false;
  }

  if (irLoginBtn) {
    irLoginBtn.addEventListener('click', function () {
      if (exitoBox) exitoBox.hidden = true;
      if (form) form.hidden = false;
      var loginRadio = document.getElementById('auth-login');
      if (loginRadio) loginRadio.checked = true;
      var loginEmail = document.getElementById('email');
      if (loginEmail && ultimoCorreo) loginEmail.value = ultimoCorreo;
      limpiarError(errorBox);
    });
  }

  if (reenviarBtn) {
    reenviarBtn.addEventListener('click', function () {
      if (!ultimoCorreo) return;

      reenviarBtn.disabled = true;
      if (reenvioEstado) {
        reenvioEstado.hidden = false;
        reenvioEstado.textContent = 'Enviando un nuevo enlace...';
      }

      fetch(API_BASE + '/api/usuarios/reenviar-confirmacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: ultimoCorreo })
      })
        .then(function (response) {
          if (!response.ok) {
            return leerError(response, 'No se pudo reenviar el correo.');
          }
          return response.json();
        })
        .then(function () {
          if (reenvioEstado) {
            reenvioEstado.textContent = 'Correo reenviado. Revisa tu bandeja de entrada y la carpeta de spam.';
          }
        })
        .catch(function (error) {
          if (reenvioEstado) {
            reenvioEstado.textContent = error.message || 'No se pudo reenviar el correo.';
          }
        })
        .finally(function () {
          reenviarBtn.disabled = false;
        });
    });
  }

  function esAdministrador() {
    return adminRadio && adminRadio.checked;
  }

  function actualizarRol() {
    var admin = esAdministrador();
    codeField.hidden = !admin;
    codeInput.required = admin;
    if (!admin) {
      codeInput.value = '';
    }
    limpiarError(errorBox);
  }

  if (usuarioRadio) usuarioRadio.addEventListener('change', actualizarRol);
  if (adminRadio) adminRadio.addEventListener('change', actualizarRol);
  actualizarRol();

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    limpiarError(errorBox);

    var email = document.getElementById('email-registro');
    var password = document.getElementById('password-registro');
    var confirmation = document.getElementById('password-confirmacion');

    if (password && confirmation && password.value !== confirmation.value) {
      mostrarError(errorBox, 'Las contraseñas no coinciden.');
      confirmation.focus();
      return;
    }

    var admin = esAdministrador();
    var payload = {
      nombre: document.getElementById('nombre').value.trim(),
      apellidos: document.getElementById('apellidos').value.trim(),
      correo: email.value.trim(),
      password: password.value,
      rol: admin ? 'administrador' : 'usuario',
      codigoAdmin: admin ? codeInput.value.trim() : null
    };

    if (submitButton) submitButton.disabled = true;

    fetch(API_BASE + '/api/usuarios/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        if (!response.ok) {
          return leerError(response, 'No se pudo crear la cuenta.');
        }
        return response.json();
      })
      .then(function (usuario) {
        mostrarExitoRegistro(usuario);
      })
      .catch(function (error) {
        mostrarError(errorBox, error.message || 'No se pudo conectar con el servidor.');
        if (submitButton) submitButton.disabled = false;
      });
  });
})();
