/* Seguridad/memoria-sesion.js · generado por separar-capas.js · el código está igual que en admin.html */
(function () {
  'use strict';
  try {
    var CLAVES = ['vs_admin_password'];
    var mem = {};
    var P = Storage.prototype, g = P.getItem, s = P.setItem, r = P.removeItem, c = P.clear;
    function esSesion(o) { try { return o === window.sessionStorage; } catch (e) { return false; } }
    P.getItem = function (k) {
      if (esSesion(this) && CLAVES.indexOf(String(k)) !== -1) return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
      return g.call(this, k);
    };
    P.setItem = function (k, v) {
      if (esSesion(this) && CLAVES.indexOf(String(k)) !== -1) { mem[k] = String(v); return; }
      return s.call(this, k, v);
    };
    P.removeItem = function (k) {
      if (esSesion(this) && CLAVES.indexOf(String(k)) !== -1) { delete mem[k]; return; }
      return r.call(this, k);
    };
    P.clear = function () { if (esSesion(this)) { mem = {}; } return c.call(this); };
    CLAVES.forEach(function (k) { try { r.call(window.sessionStorage, k); } catch (e) {} });
  } catch (e) {}
})();
