/* Seguridad/red-segura.js · generado por separar-capas.js · el código está igual que en admin.html */
(function () {
  'use strict';
  var API = '/api/admin-pedidos', TIMEOUT = 25 * 1000, expulsando = false;
  var base = window.fetch.bind(window);

  function sesionActiva() { try { return !!sessionStorage.getItem('vs_admin_password'); } catch (e) { return false; } }

  window.fetch = function (input, init) {
    var raw = (typeof input === 'string') ? input : ((input && input.url) || String(input || ''));
    var u;
    try { u = new URL(raw, location.href); } catch (e) { return Promise.reject(new TypeError('URL no válida.')); }
    if (u.origin !== location.origin) {
      return Promise.reject(new TypeError('Bloqueado por seguridad: solo se permiten peticiones al mismo sitio.'));
    }
    var o = Object.assign({}, init || {});
    o.credentials = 'same-origin';
    o.referrerPolicy = 'no-referrer';
    var esAdmin = (u.pathname === API);
    if (esAdmin) {
      o.cache = 'no-store';
      var h = new Headers(o.headers || {});
      h.set('X-Requested-With', 'vs-admin');
      o.headers = h;
    }
    var tm = null;
    if (!o.signal && typeof AbortController !== 'undefined') {
      var ctl = new AbortController();
      o.signal = ctl.signal;
      tm = setTimeout(function () { ctl.abort(); }, TIMEOUT);
    }
    return base(input, o).then(function (resp) {
      if (tm) clearTimeout(tm);
      if (esAdmin && resp.status === 401 && sesionActiva() && !expulsando) {
        expulsando = true;
        setTimeout(function () { expulsando = false; }, 3000);
        if (typeof window.__secCerrarSesion === 'function') window.__secCerrarSesion('Tu sesión ya no es válida. Entra de nuevo.');
        else { try { cerrarSesion(); } catch (e) {} }
      }
      return resp;
    }, function (err) {
      if (tm) clearTimeout(tm);
      throw err;
    });
  };

  /* Limpieza de restos antiguos en el disco */
  try { localStorage.removeItem('vs_admin_password'); } catch (e) {}
  try { localStorage.removeItem('valera_admin_datos'); } catch (e) {}
})();
