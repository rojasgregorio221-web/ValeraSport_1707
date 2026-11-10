#!/usr/bin/env node
/* =====================================================================
   aplicar-seguridad.js  ·  Endurecimiento por capas para el admin de ValeraSport

   USO (en la terminal de VS Code, en la carpeta del proyecto):
     node aplicar-seguridad.js admin.html            -> aplica todas las capas
     node aplicar-seguridad.js admin.html --dry      -> simula, no escribe nada
     node aplicar-seguridad.js admin.html --capas=1,2 -> solo esas capas
     node aplicar-seguridad.js admin.html --revertir -> vuelve al último respaldo
     node aplicar-seguridad.js --ayuda

   OPCIONES:
     --sin-memoria    la clave queda en sessionStorage (recargar NO cierra sesión)
     --sin-antiframe  no bloquea que el panel se abra dentro de un iframe
                      (úsalo si lo previsualizas en el Simple Browser de VS Code)
     --sin-congelar   no congela window.fetch (si piensas añadir más parches a fetch)
     --sin-servidor   no genera la carpeta seguridad-servidor/
     --forzar         aplica aunque el archivo original ya tenga errores de sintaxis

   CAPAS:
     1  Acceso (login): clave solo en memoria, bloqueo por intentos con espera
        creciente, retardo mínimo, duración máxima de sesión, cierre por
        pestaña oculta, inactividad más corta, endurecimiento del campo clave.
     2  Interfaz: CSP más estricta, anti-clickjacking, referrer, vigilante del
        DOM (iframes, javascript:, imágenes/formularios externos), desenfoque
        al ocultar la pestaña, autocompletado apagado en datos de clientes.
     3  Datos y comunicaciones: fetch solo al mismo origen, sin caché, con
        tiempo límite, cierre de sesión ante 401, caché de pedidos en
        sessionStorage (no queda en el disco).
     4  Anti-abuso: límite de peticiones, consola silenciada, fetch congelado.
     5  Servidor: genera cabeceras HTTP y una guía para blindar /api/admin-pedidos.
     6  Verificación: revisa la sintaxis de cada <script> antes de guardar.

   IMPORTANTE: el navegador NUNCA es una frontera de seguridad. Estas capas
   frenan ataques comunes y reducen daños, pero la protección real está en el
   servidor (capa 5). Lee seguridad-servidor/LEEME-SERVIDOR.md.
   ===================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ----------------------- CONFIGURACIÓN (puedes editarla) ----------------------- */
const CFG = {
  inactividadMin: 10,       // minutos sin tocar nada -> cierra sesión (antes 20)
  sesionMaxHoras: 8,        // duración máxima absoluta de una sesión
  ocultoMaxMin: 5,          // minutos con la pestaña oculta -> cierra sesión
  maxIntentos: 5,           // fallos antes de bloquear
  bloqueoBaseSeg: 30,       // primer bloqueo (se duplica en cada fallo extra)
  bloqueoMaxSeg: 900,       // bloqueo máximo (15 min)
  timeoutApiSeg: 25,        // tiempo límite de cada petición
  maxPeticiones10s: 60,     // tope de peticiones a /api/admin-pedidos cada 10 s
  claveEnMemoria: true,
  antiframe: true,
  silenciarConsola: true,
  congelarFetch: true,
  cacheEnSesion: true,
  generarArchivosServidor: true,
};

/* ----------------------- ARGUMENTOS ----------------------- */
const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
if (flag('ayuda') || flag('help') || flag('h')) {
  const src = fs.readFileSync(__filename, 'utf8');
  console.log(src.split('*/')[0].replace(/^#!.*\n/, '').replace(/^\/\* ?/, ''));
  process.exit(0);
}
if (flag('sin-memoria')) CFG.claveEnMemoria = false;
if (flag('sin-antiframe')) CFG.antiframe = false;
if (flag('sin-congelar')) CFG.congelarFetch = false;
if (flag('sin-servidor')) CFG.generarArchivosServidor = false;
const DRY = flag('dry');
const FORZAR = flag('forzar');
const REVERTIR = flag('revertir');
const capasArg = (args.find((a) => a.startsWith('--capas=')) || '').split('=')[1];
const CAPAS = capasArg
  ? capasArg.split(',').map((x) => parseInt(x, 10)).filter((x) => x >= 1 && x <= 5)
  : [1, 2, 3, 4, 5];
const usaCapa = (n) => CAPAS.includes(n);

const ok = (t) => console.log('  \u2714 ' + t);
const aviso = (t) => console.log('  ! ' + t);
const titulo = (t) => console.log('\n' + t);
function morir(t) { console.error('\n\u2716 ' + t + '\n'); process.exit(1); }

/* ----------------------- LOCALIZAR EL ARCHIVO ----------------------- */
function localizar() {
  const dado = args.find((a) => !a.startsWith('--'));
  if (dado) return path.resolve(dado);
  const cand = ['admin.html', 'admin/index.html', 'public/admin.html', 'admin/admin.html', 'public/admin/index.html'];
  for (const c of cand) if (fs.existsSync(c)) return path.resolve(c);
  return null;
}
const archivo = localizar();
if (!archivo || !fs.existsSync(archivo)) {
  morir('No encontré el HTML del admin.\nEjemplo: node aplicar-seguridad.js admin.html');
}
const dir = path.dirname(archivo);
const base = path.basename(archivo);

/* ----------------------- REVERTIR ----------------------- */
if (REVERTIR) {
  const resp = fs.readdirSync(dir).filter((f) => f.startsWith(base + '.bak-')).sort();
  if (!resp.length) morir('No hay respaldos de ' + base + ' en ' + dir);
  const ultimo = resp[resp.length - 1];
  fs.copyFileSync(path.join(dir, ultimo), archivo);
  console.log('\n\u2714 Restaurado ' + base + ' desde ' + ultimo + '\n');
  process.exit(0);
}

/* ----------------------- UTILIDADES ----------------------- */
function rellenar(txt, mapa) {
  return txt.replace(/__([A-Z0-9_]+)__/g, (m, k) => (k in mapa ? String(mapa[k]) : m));
}
function bloque(nombre, contenido) {
  return '<!-- sec:' + nombre + ':inicio -->\n' + contenido.trim() + '\n<!-- sec:' + nombre + ':fin -->';
}
function quitarBloques(html) {
  return html.replace(/<!-- sec:([\w-]+):inicio -->[\s\S]*?<!-- sec:\1:fin -->\r?\n?/g, () => '');
}
function compilarScripts(html) {
  const errores = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m, i = 0;
  while ((m = re.exec(html))) {
    i++;
    const attrs = m[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const tipo = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
    if (tipo && !/javascript/i.test(tipo)) continue;
    try {
      new vm.Script(m[2], { filename: 'script-inline-' + i });   // solo compila, NO ejecuta
    } catch (e) {
      errores.push('<script> #' + i + ': ' + e.message);
    }
  }
  return errores;
}

/* =====================================================================
   BLOQUES INYECTADOS (JavaScript del navegador, sin backticks ni ${ })
   ===================================================================== */

/* ---------- CAPA 1a · clave solo en memoria (va en <head>, antes de todo) ---------- */
const C1_MEMORIA = String.raw`
<script>
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
</script>`;

/* ---------- CAPA 1b · login ---------- */
const C1_LOGIN = String.raw`
<script>
(function () {
  'use strict';
  var MAX_INTENTOS = __MAX_INTENTOS__, BLOQUEO_BASE = __BLOQUEO_BASE__, BLOQUEO_MAX = __BLOQUEO_MAX__;
  var SESION_MAX_MS = __SESION_MAX_H__ * 3600000, OCULTO_MAX_MS = __OCULTO_MAX_MIN__ * 60000;
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
</script>`;

/* ---------- CAPA 2a · cabecera: meta + anti-clickjacking ---------- */
const C2_META = String.raw`
<meta name="referrer" content="no-referrer">
<meta http-equiv="Cache-Control" content="no-store">`;

const C2_ANTIFRAME = String.raw`
<style id="sec-antiframe-css">html{visibility:hidden}</style>
<script>
(function () {
  try {
    if (window.self === window.top) { document.documentElement.style.visibility = 'visible'; }
    else { window.top.location = window.self.location; }
  } catch (e) {}
})();
</script>`;

/* ---------- CAPA 2b · interfaz ---------- */
const C2_UI = String.raw`
<style id="sec-capa2-css">.sec-privado #panelPrincipal{filter:blur(16px);pointer-events:none}</style>
<script>
(function () {
  'use strict';
  var OK_IMG = /^(https:|data:image\/|blob:)/i;
  var SEL = 'iframe,frame,object,embed,applet,base,a,img,form,input';

  function uno(n) {
    if (!n || n.nodeType !== 1) return;
    var t = n.tagName;
    if (t === 'IFRAME' || t === 'FRAME' || t === 'OBJECT' || t === 'EMBED' || t === 'APPLET' || t === 'BASE') { n.remove(); return; }
    if (t === 'A') {
      var h = n.getAttribute('href') || '';
      if (/^\s*(javascript|data|vbscript):/i.test(h)) n.removeAttribute('href');
      if (n.target === '_blank') n.rel = 'noopener noreferrer';
      n.referrerPolicy = 'no-referrer';
    } else if (t === 'IMG') {
      var s = n.getAttribute('src');
      if (s) {
        var abs = null;
        try { abs = new URL(s, location.href); } catch (e) {}
        if (!abs || !(abs.origin === location.origin || OK_IMG.test(abs.href))) n.removeAttribute('src');
      }
      n.referrerPolicy = 'no-referrer';
    } else if (t === 'FORM') {
      var a = n.getAttribute('action');
      if (a) { try { if (new URL(a, location.href).origin !== location.origin) n.removeAttribute('action'); } catch (e) { n.removeAttribute('action'); } }
    } else if (t === 'INPUT') {
      if (n.type !== 'password' && n.getAttribute('autocomplete') !== 'off') n.setAttribute('autocomplete', 'off');
    }
  }
  function arbol(n) {
    uno(n);
    if (n && n.querySelectorAll) { var l = n.querySelectorAll(SEL); for (var i = 0; i < l.length; i++) uno(l[i]); }
  }

  arbol(document.documentElement);
  if (window.MutationObserver) {
    new MutationObserver(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var m = lista[i];
        if (m.type === 'attributes') { uno(m.target); continue; }
        for (var j = 0; j < m.addedNodes.length; j++) arbol(m.addedNodes[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href', 'action'] });
  }

  /* Privacidad: al cambiar de app/pestaña el panel se desenfoca */
  document.addEventListener('visibilitychange', function () {
    document.documentElement.classList.toggle('sec-privado', document.hidden);
  });
})();
</script>`;

/* ---------- CAPA 3 · datos y comunicaciones ---------- */
const C3_RED = String.raw`
<script>
(function () {
  'use strict';
  var API = '/api/admin-pedidos', TIMEOUT = __TIMEOUT__ * 1000, expulsando = false;
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
  __PURGAR_CACHE__
})();
</script>`;

/* ---------- CAPA 4 · anti-abuso ---------- */
const C4_ABUSO = String.raw`
<script>
(function () {
  'use strict';
  var MAX = __MAX_PETICIONES__, VENTANA = 10000, marcas = [];
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
  __SILENCIAR__
  __CONGELAR__
})();
</script>`;

const SNIP_SILENCIAR = String.raw`
  try {
    ['log', 'debug', 'info', 'trace'].forEach(function (k) { console[k] = function () {}; });
  } catch (e) {}`;

const SNIP_CONGELAR = String.raw`
  window.addEventListener('load', function () {
    setTimeout(function () {
      try { Object.defineProperty(window, 'fetch', { value: window.fetch, writable: false, configurable: false }); } catch (e) {}
      try { if (typeof window.escapeHTML === 'function') Object.defineProperty(window, 'escapeHTML', { value: window.escapeHTML, writable: false, configurable: false }); } catch (e) {}
    }, 2000);
  });`;

/* =====================================================================
   CONTENIDO DE LA CAPA 5 (archivos del servidor)
   ===================================================================== */
function cspCabecera() {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "frame-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}
// En <meta> no se permite frame-ancestors, por eso se quita en la versión del HTML
const CSP_META = cspCabecera().replace("; frame-ancestors 'none'", '');

const CABECERAS = [
  ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['Referrer-Policy', 'no-referrer'],
  ['Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'],
  ['Cross-Origin-Opener-Policy', 'same-origin'],
  ['Cross-Origin-Resource-Policy', 'same-origin'],
  ['Cache-Control', 'no-store'],
  ['Content-Security-Policy', cspCabecera()],
];

const GUIA_SERVIDOR = String.raw`# Blindaje del servidor (/api/admin-pedidos)

Todo lo que hace aplicar-seguridad.js en el navegador se puede saltar con una
herramienta como curl. La seguridad real se decide aquí. En orden de importancia:

## 1. Clave: nunca en texto plano ni comparada con ===
- Guarda solo un hash (scrypt) en variables de entorno, nunca en el código.
- Compara con crypto.timingSafeEqual.

  // Generar el hash UNA vez (terminal):
  //   node -e "const c=require('crypto');const s=c.randomBytes(16);console.log('ADMIN_SALT='+s.toString('hex'));console.log('ADMIN_HASH='+c.scryptSync(process.argv[1],s,64).toString('hex'))" "TuClaveLarga"

  const crypto = require('crypto');
  function claveValida(ingresada) {
    const salt = Buffer.from(process.env.ADMIN_SALT, 'hex');
    const esperado = Buffer.from(process.env.ADMIN_HASH, 'hex');
    const hash = crypto.scryptSync(String(ingresada || '').slice(0, 128), salt, 64);
    return hash.length === esperado.length && crypto.timingSafeEqual(hash, esperado);
  }

- Usa una clave larga (16+ caracteres, frase). Cámbiala si alguna vez se filtró.

## 2. Límite de intentos REAL (por IP, persistente)
El bloqueo del navegador se evita borrando el almacenamiento. En el servidor usa
un contador persistente (Vercel KV / Upstash Redis / Cloudflare KV):
- 5 fallos por IP en 15 min -> responder 429 durante 15-60 min.
- Responder igual de lento a clave buena o mala (evita adivinar por tiempos).

## 3. Sesión con token en vez de enviar la clave en cada petición
Hoy la clave viaja en el cuerpo de CADA petición. Mejor:
- Login: validar la clave UNA vez y emitir un token firmado (HMAC-SHA256) con
  vencimiento de 20 min, guardado en cookie HttpOnly; Secure; SameSite=Strict.
- Las demás peticiones usan la cookie. El JavaScript de la página ya no puede
  leer ninguna credencial, ni siquiera si hubiera un XSS.
- Verificar el token con timingSafeEqual y revocarlo al salir.

## 4. Validar cada petición
- Aceptar solo POST con Content-Type: application/json.
- Comprobar que el encabezado Origin coincida con tu dominio.
- Exigir el encabezado X-Requested-With: vs-admin (lo añade la capa 3).
- Validar tipos y rangos (precio 0-9999, stock entero, textos con largo máximo).
- Lista blanca de acciones: ventaFisica, editarVenta, guardarProducto, etc.
  Cualquier otra -> 400.
- Limitar el tamaño del cuerpo (por ejemplo 100 KB).

## 5. Inyección de fórmulas (si guardas en Google Sheets / Excel)
Un texto como =IMPORTXML(...) o =HYPERLINK(...) en una nota, nombre de cliente o
prenda se ejecuta al abrir la hoja. Antes de escribir una celda, si el texto
empieza por = + - @ tab o retorno, antepón un apóstrofo '.

## 6. Acciones destructivas
- vaciarVentas, rechazar_todos, eliminarProducto: exigir confirmación adicional
  (volver a pedir la clave o un código TOTP) y dejar registro.
- Guardar un registro de auditoría: fecha, IP, acción, resultado.

## 7. Secretos y cuentas
- Credenciales de Google/APIs solo en variables de entorno, con la cuenta de
  servicio limitada a la hoja necesaria (permiso mínimo).
- Activa 2FA en GitHub, Vercel/Netlify, Google y tu correo.
- Revisa que ningún .env quede subido al repositorio (.gitignore).

## 8. Cabeceras HTTP
Aplica las del archivo de esta carpeta que corresponda a tu hosting
(vercel.headers.json, netlify_headers.txt o nginx.snippet.conf). Estas SÍ pueden
usar frame-ancestors, HSTS y Permissions-Policy, que en un <meta> no funcionan.

## 9. Limitación que sigue existiendo en el HTML
El panel usa onclick="..." y scripts en línea, por eso la CSP conserva
'unsafe-inline' en script-src. Para quitarlo habría que mover todo a archivos .js
externos y usar addEventListener (o nonces generados por el servidor). Mientras
tanto, las capas 2-4 + escapeHTML + SRI en las librerías reducen el riesgo.
`;

function generarServidor() {
  const out = path.join(dir, 'seguridad-servidor');
  fs.mkdirSync(out, { recursive: true });
  const nombre = base.replace(/\.html?$/i, '');
  const fuentes = ['/' + base];
  if (nombre !== 'index') fuentes.push('/' + nombre);
  const vercel = {
    headers: [
      ...fuentes.map((s) => ({ source: s, headers: CABECERAS.map(([key, value]) => ({ key, value })) })),
      { source: '/api/(.*)', headers: [
        { key: 'Cache-Control', value: 'no-store' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ] },
    ],
  };
  fs.writeFileSync(path.join(out, 'vercel.headers.json'), JSON.stringify(vercel, null, 2) + '\n');

  let net = '';
  fuentes.forEach((s) => { net += s + '\n' + CABECERAS.map(([k, v]) => '  ' + k + ': ' + v).join('\n') + '\n\n'; });
  net += '/api/*\n  Cache-Control: no-store\n  X-Content-Type-Options: nosniff\n';
  fs.writeFileSync(path.join(out, 'netlify_headers.txt'), net);

  const ng = fuentes.map((s) =>
    'location = ' + s + ' {\n' + CABECERAS.map(([k, v]) => '    add_header ' + k + ' "' + v.replace(/"/g, '\\"') + '" always;').join('\n') + '\n}\n'
  ).join('\n');
  fs.writeFileSync(path.join(out, 'nginx.snippet.conf'), ng);
  fs.writeFileSync(path.join(out, 'LEEME-SERVIDOR.md'), GUIA_SERVIDOR);
  return out;
}

/* =====================================================================
   PROCESO PRINCIPAL
   ===================================================================== */
console.log('\n=== Seguridad por capas · ' + base + ' ===');
console.log('Archivo: ' + archivo + (DRY ? '   (SIMULACIÓN: no se escribe nada)' : ''));

const original = fs.readFileSync(archivo, 'utf8');
if (!/<head[^>]*>/i.test(original) || original.lastIndexOf('</body>') === -1) {
  morir('El archivo no parece un HTML completo (falta <head> o </body>).');
}

titulo('Capa 6 · Revisión previa del original');
const erroresPrevios = compilarScripts(quitarBloques(original));
if (erroresPrevios.length) {
  erroresPrevios.forEach((e) => aviso(e));
  if (!FORZAR) morir('El HTML original ya tiene errores de sintaxis. Arréglalos primero (o usa --forzar).');
  aviso('Continúo por --forzar.');
} else ok('Todos los <script> del original compilan bien.');

['probarPassword', 'cerrarSesion', 'MINUTOS_INACTIVIDAD', 'LLAVE_CACHE'].forEach((k) => {
  if (!original.includes(k)) aviso('No encontré "' + k + '" en el HTML: alguna protección podría no aplicar.');
});

let html = quitarBloques(original);
const cabeza = [];
const cuerpo = [];

/* ---------------- CAPA 1 ---------------- */
if (usaCapa(1)) {
  titulo('Capa 1 · Acceso (login)');
  if (CFG.claveEnMemoria) {
    cabeza.push(bloque('capa1-memoria', C1_MEMORIA));
    ok('La clave vive solo en memoria (no queda en sessionStorage; recargar pide la clave otra vez).');
  } else aviso('Clave en sessionStorage (--sin-memoria).');

  cuerpo.push(bloque('capa1-login', rellenar(C1_LOGIN, {
    MAX_INTENTOS: CFG.maxIntentos, BLOQUEO_BASE: CFG.bloqueoBaseSeg, BLOQUEO_MAX: CFG.bloqueoMaxSeg,
    SESION_MAX_H: CFG.sesionMaxHoras, OCULTO_MAX_MIN: CFG.ocultoMaxMin,
  })));
  ok('Bloqueo tras ' + CFG.maxIntentos + ' fallos, con espera que se duplica (máx. ' + Math.round(CFG.bloqueoMaxSeg / 60) + ' min).');
  ok('Retardo mínimo de 700 ms por intento y clave limitada a 128 caracteres.');
  ok('Sesión máxima de ' + CFG.sesionMaxHoras + ' h y cierre tras ' + CFG.ocultoMaxMin + ' min con la pestaña oculta.');

  const antes = html;
  html = html.replace(/const MINUTOS_INACTIVIDAD = \d+;/, () => 'const MINUTOS_INACTIVIDAD = ' + CFG.inactividadMin + ';');
  if (html !== antes) ok('Inactividad reducida a ' + CFG.inactividadMin + ' min.');
  else if (/const MINUTOS_INACTIVIDAD = \d+;/.test(html)) ok('Inactividad ya estaba en ' + CFG.inactividadMin + ' min.');
}

/* ---------------- CAPA 2 ---------------- */
if (usaCapa(2)) {
  titulo('Capa 2 · Interfaz');
  const metaCSP = '<meta http-equiv="Content-Security-Policy" content="' + CSP_META + '">';
  const reCSP = /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i;
  if (reCSP.test(html)) html = html.replace(reCSP, () => metaCSP);
  else html = html.replace(/<head[^>]*>/i, (m) => m + '\n' + metaCSP);
  ok('CSP reescrita: sin unpkg/jQuery, sin frames, sin workers, https forzado.');

  cabeza.push(bloque('capa2-meta', C2_META));
  ok('Referrer-Policy: no-referrer y sin caché del HTML.');
  if (CFG.antiframe) {
    cabeza.push(bloque('capa2-antiframe', C2_ANTIFRAME));
    ok('Anti-clickjacking: el panel no se muestra dentro de un iframe.');
  } else aviso('Anti-iframe desactivado (--sin-antiframe).');

  cuerpo.push(bloque('capa2-interfaz', C2_UI));
  ok('Vigilante del DOM: elimina iframes/embeds, enlaces javascript:, imágenes y formularios externos.');
  ok('Panel desenfocado al ocultar la pestaña; autocompletado apagado en datos de clientes.');
}

/* ---------------- CAPA 3 ---------------- */
if (usaCapa(3)) {
  titulo('Capa 3 · Datos y comunicaciones');
  let purgar = '';
  if (CFG.cacheEnSesion) {
    const antes = html;
    html = html.replace(/\blocalStorage\.(getItem|setItem|removeItem)\(LLAVE_CACHE/g, (m, f) => 'sessionStorage.' + f + '(LLAVE_CACHE');
    purgar = "try { localStorage.removeItem('valera_admin_datos'); } catch (e) {}";
    if (html !== antes) ok('La caché de pedidos (teléfonos, referencias) pasa a sessionStorage: ya no queda en el disco.');
    else ok('La caché de pedidos ya estaba en sessionStorage.');
  }
  cuerpo.push(bloque('capa3-red', rellenar(C3_RED, { TIMEOUT: CFG.timeoutApiSeg, PURGAR_CACHE: purgar })));
  ok('fetch: solo mismo origen, sin caché, con límite de ' + CFG.timeoutApiSeg + ' s y cierre de sesión ante 401.');
}

/* ---------------- CAPA 4 ---------------- */
if (usaCapa(4)) {
  titulo('Capa 4 · Anti-abuso');
  cuerpo.push(bloque('capa4-abuso', rellenar(C4_ABUSO, {
    MAX_PETICIONES: CFG.maxPeticiones10s,
    SILENCIAR: CFG.silenciarConsola ? SNIP_SILENCIAR : '',
    CONGELAR: CFG.congelarFetch ? SNIP_CONGELAR : '',
  })));
  ok('Tope de ' + CFG.maxPeticiones10s + ' peticiones a la API cada 10 s.');
  if (CFG.silenciarConsola) ok('console.log/info/debug silenciados (warn y error siguen).');
  if (CFG.congelarFetch) ok('fetch y escapeHTML quedan congelados: un script inyectado no puede reemplazarlos.');
}

/* ---------------- INSERCIÓN ---------------- */
if (cabeza.length) {
  const m = /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i.exec(html) || /<head[^>]*>/i.exec(html);
  const pos = m.index + m[0].length;
  html = html.slice(0, pos) + '\n' + cabeza.join('\n') + html.slice(pos);
}
if (cuerpo.length) {
  const pos = html.lastIndexOf('</body>');
  html = html.slice(0, pos) + cuerpo.join('\n') + '\n' + html.slice(pos);
}

/* ---------------- CAPA 6: VERIFICACIÓN ---------------- */
titulo('Capa 6 · Verificación del resultado');
const errores = compilarScripts(html);
if (errores.length && !erroresPrevios.length) {
  errores.forEach((e) => console.error('  \u2716 ' + e));
  morir('El resultado tendría errores de sintaxis. NO se modificó ningún archivo.');
}
const abiertos = (html.match(/<!-- sec:[\w-]+:inicio -->/g) || []).length;
const cerrados = (html.match(/<!-- sec:[\w-]+:fin -->/g) || []).length;
if (abiertos !== cerrados) morir('Marcadores desbalanceados. NO se modificó ningún archivo.');
ok('Sintaxis correcta en todos los <script> (' + abiertos + ' bloques de seguridad).');
if (usaCapa(2) && !html.includes('upgrade-insecure-requests')) morir('La CSP no quedó aplicada.');

/* ---------------- ESCRITURA ---------------- */
if (DRY) {
  console.log('\nSimulación terminada. No se escribió nada.\n');
  process.exit(0);
}
const sello = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const respaldo = path.join(dir, base + '.bak-' + sello);
fs.copyFileSync(archivo, respaldo);
fs.writeFileSync(archivo, html, 'utf8');
titulo('Listo');
ok('Respaldo: ' + path.basename(respaldo) + '  (para volver: node aplicar-seguridad.js ' + base + ' --revertir)');
ok('Archivo actualizado: ' + base);

if (usaCapa(5) && CFG.generarArchivosServidor) {
  titulo('Capa 5 · Servidor');
  const carpeta = generarServidor();
  ok('Generado: ' + path.relative(process.cwd(), carpeta) + path.sep + '  (cabeceras HTTP + LEEME-SERVIDOR.md)');
  aviso('Esta capa NO se aplica sola: copia las cabeceras a tu hosting y sigue la guía.');
}

console.log('\nRecuerda: puedes ejecutar el script de nuevo sin miedo, reemplaza sus propios bloques.');
console.log('Prueba el login, una venta, el escáner y el inventario antes de subir a producción.\n');