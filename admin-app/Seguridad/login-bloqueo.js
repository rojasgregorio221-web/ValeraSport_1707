/* Seguridad/login-bloqueo.js · generado por separar-capas.js · el código está igual que en admin.html */
(function () {
  'use strict';
  var MAX_INTENTOS = 5, BLOQUEO_BASE = 30, BLOQUEO_MAX = 900;
  var SESION_MAX_MS = 8 * 3600000, OCULTO_MAX_MS = 5 * 60000;
  var LONG_MAX = 128, RETARDO_MIN = 700;
  var K_BLOQ = 'vs_sec_bloqueo', K_INI = 'vs_sec_inicio', K_PASS = 'vs_admin_password';

  function leer() {
    try { var o = JSON.parse(localStorage.getItem(K_BLOQ) || 'null'); if (o && typeof o.n === 'number' && typeof o.hasta === 'number') return o; } catch (e) {}
    return { n: 0, hasta: 0 };
  }
  function guardar(o) { try { localStorage.setItem(K_BLOQ, JSON.stringify(o)); } catch (e) {} }
  function limpiarBloqueo() { try { localStorage.removeItem(K_BLOQ); } catch (e) {} }
  function fmt(ms) { var s = Math.ceil(ms / 1000); if (s < 60) return s + ' s'; var m = Math.floor(s / 60), r = s % 60; return m + ' min' + (r ? ' ' + r + ' s' : ''); }
  function pausa(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }
  function sesionActiva() { try { return !!sessionStorage.getItem(K_PASS); } catch (e) { return false; } }
  function cerrar(msg) {
    try { if (typeof cerrarSesion === 'function') cerrarSesion(); } catch (e) {}
    try { sessionStorage.removeItem(K_INI); } catch (e) {}
    var er = document.getElementById('errorLogin');
    if (er && msg) { er.textContent = msg; er.className = 'msg msg-warn'; }
  }
  window.__secCerrarSesion = cerrar;

  /* Envuelve la comprobación de clave: bloqueo, retardo mínimo, validación de formato */
  var orig = window.probarPassword;
  if (typeof orig === 'function') {
    window.probarPassword = async function (clave) {
      var est = leer(), ahora = Date.now();
      if (est.hasta > ahora) {
        return { valida: false, mensaje: 'Demasiados intentos fallidos. Espera ' + fmt(est.hasta - ahora) + ' para volver a intentar.' };
      }
      if (typeof clave !== 'string' || !clave || clave.length > LONG_MAX) {
        return { valida: false, mensaje: 'La clave no tiene un formato válido.' };
      }
      var t0 = Date.now(), res;
      try { res = await orig(clave); } catch (e) { res = { valida: false, mensaje: 'No se pudo conectar con el servidor.' }; }
      var resto = RETARDO_MIN - (Date.now() - t0);
      if (resto > 0) await pausa(resto);

      if (res && res.valida) {
        limpiarBloqueo();
        try { sessionStorage.setItem(K_INI, String(Date.now())); } catch (e) {}
        setTimeout(function () { var i = document.getElementById('inputPassword'); if (i) i.value = ''; }, 900);
      } else if (res && !res.mensaje) {
        /* solo cuenta como fallo cuando el servidor dijo 401 (clave incorrecta) */
        var n = est.n + 1, o = { n: n, hasta: 0 };
        if (n >= MAX_INTENTOS) {
          var exp = Math.min(BLOQUEO_BASE * Math.pow(2, n - MAX_INTENTOS), BLOQUEO_MAX);
          o.hasta = Date.now() + exp * 1000;
          res = { valida: false, mensaje: 'Clave incorrecta. Acceso bloqueado ' + fmt(exp * 1000) + ' por seguridad.' };
        } else {
          res = { valida: false, mensaje: 'Esa clave no es. Te quedan ' + (MAX_INTENTOS - n) + (MAX_INTENTOS - n === 1 ? ' intento.' : ' intentos.') };
        }
        guardar(o);
      }
      return res;
    };
  }

  /* Duración máxima absoluta de la sesión */
  setInterval(function () {
    if (!sesionActiva()) return;
    var ini = 0;
    try { ini = Number(sessionStorage.getItem(K_INI) || 0); } catch (e) {}
    if (!ini) { try { sessionStorage.setItem(K_INI, String(Date.now())); } catch (e) {} return; }
    if (Date.now() - ini > SESION_MAX_MS) cerrar('Por seguridad, la sesión llegó a su duración máxima. Entra de nuevo.');
  }, 30000);

  /* Pestaña oculta demasiado tiempo */
  var ocultoDesde = 0;
  document.addEventListener('visibilitychange', function () {
    if (!sesionActiva()) { ocultoDesde = 0; return; }
    if (document.hidden) { ocultoDesde = Date.now(); }
    else {
      if (ocultoDesde && Date.now() - ocultoDesde > OCULTO_MAX_MS) cerrar('Por seguridad, la sesión se cerró porque dejaste la pestaña oculta mucho tiempo.');
      ocultoDesde = 0;
    }
  });

  /* Campo de clave */
  var inp = document.getElementById('inputPassword');
  if (inp) {
    inp.setAttribute('maxlength', String(LONG_MAX));
    inp.setAttribute('autocapitalize', 'off');
    inp.setAttribute('autocorrect', 'off');
    inp.setAttribute('spellcheck', 'false');
    var av = document.getElementById('avisoMayusculas');
    if (av) {
      inp.addEventListener('keydown', function (e) {
        if (e.getModifierState) av.classList.toggle('hidden', !e.getModifierState('CapsLock'));
      });
    }
  }
})();
