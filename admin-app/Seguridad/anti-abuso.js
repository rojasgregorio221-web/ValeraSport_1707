/* Seguridad/anti-abuso.js · generado por separar-capas.js · el código está igual que en admin.html */
(function () {
  'use strict';
  var MAX = 60, VENTANA = 10000, marcas = [];
  var f = window.fetch;
  window.fetch = function (input) {
    var raw = (typeof input === 'string') ? input : ((input && input.url) || '');
    var esAdmin = false;
    try { esAdmin = new URL(raw, location.href).pathname === '/api/admin-pedidos'; } catch (e) {}
    if (esAdmin) {
      var ahora = Date.now();
      marcas = marcas.filter(function (t) { return ahora - t < VENTANA; });
      if (marcas.length >= MAX) {
        return Promise.resolve(new Response(JSON.stringify({ ok: false, error: 'Demasiadas solicitudes seguidas. Espera unos segundos.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }));
      }
      marcas.push(ahora);
    }
    return f.apply(this, arguments);
  };
  
  try {
    ['log', 'debug', 'info', 'trace'].forEach(function (k) { console[k] = function () {}; });
  } catch (e) {}
  
  window.addEventListener('load', function () {
    setTimeout(function () {
      try { Object.defineProperty(window, 'fetch', { value: window.fetch, writable: false, configurable: false }); } catch (e) {}
      try { if (typeof window.escapeHTML === 'function') Object.defineProperty(window, 'escapeHTML', { value: window.escapeHTML, writable: false, configurable: false }); } catch (e) {}
    }, 2000);
  });
})();
