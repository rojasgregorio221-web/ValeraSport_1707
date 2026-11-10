#!/usr/bin/env node
/*
 * integrar-seguridad.js · Arreglos de seguridad del panel (admin.html), capa por capa.
 *
 * Uso (desde la terminal de VS Code, en la carpeta del proyecto):
 *   node integrar-seguridad.js capa1            sesión: cierre por inactividad y limpieza al salir
 *   node integrar-seguridad.js capa2            cabeceras: CSP más estricta + archivo _headers
 *   node integrar-seguridad.js capa3            XSS: escapar comillas y quitar ids de los onclick
 *   node integrar-seguridad.js todas            las tres, en orden
 *   node integrar-seguridad.js deshacer         vuelve al respaldo más reciente
 *   node integrar-seguridad.js ayuda            lo que falta hacer en Cloudflare
 *
 * Opcional: pasar la ruta del archivo   node integrar-seguridad.js capa1 public/admin.html
 *
 * Qué hace de seguro:
 *  - Antes de cambiar algo guarda un respaldo (admin.html.respaldo-capaN-FECHA).
 *  - Busca el texto EXACTO que va a cambiar. Si no lo encuentra, o lo encuentra repetido,
 *    NO escribe nada y te dice cuál falló.
 *  - Se puede ejecutar dos veces: si la capa ya está, la salta.
 */
const fs = require('fs');
const path = require('path');

// ------------------------------------------------------------------ utilidades
const MARCAS = { capa1: 'seguridad:capa1', capa2: 'seguridad:capa2', capa3: 'seguridad:capa3' };

function buscarAdmin(ruta) {
  const candidatos = [ruta, 'admin.html', 'public/admin.html', 'ValeraSport_1707/admin.html'].filter(Boolean);
  for (const c of candidatos) if (fs.existsSync(c) && fs.statSync(c).isFile()) return path.resolve(c);
  return null;
}
const sello = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

// Cambia UN texto exacto por otro. Falla si no está o si está repetido.
function cambiar(html, viejo, nuevo, nombre) {
  const n = html.split(viejo).length - 1;
  if (n !== 1) throw new Error(`"${nombre}": esperaba encontrarlo 1 vez y lo encontré ${n}.`);
  return html.replace(viejo, () => nuevo);
}
function cambiarRegex(html, re, nuevo, nombre) {
  const m = html.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
  const n = m ? m.length : 0;
  if (n !== 1) throw new Error(`"${nombre}": esperaba encontrarlo 1 vez y lo encontré ${n}.`);
  return html.replace(re, () => nuevo);
}

// ------------------------------------------------------------------ CAPA 1 · sesión
function capa1(html) {
  html = cambiar(html,
    "const PASSWORD_KEY = 'vs_admin_password';",
    "const PASSWORD_KEY = 'vs_admin_password';\n" +
    "        const ACTIVIDAD_KEY = 'vs_admin_actividad';   /* seguridad:capa1 */\n" +
    "        const MINUTOS_INACTIVIDAD = 20;               // cambia este número si quieres más o menos tiempo",
    'constante PASSWORD_KEY');

  html = cambiar(html,
    'sessionStorage.setItem(PASSWORD_KEY, clave);',
    "sessionStorage.setItem(PASSWORD_KEY, clave);\n                sessionStorage.setItem(ACTIVIDAD_KEY, String(Date.now()));",
    'guardar clave al entrar');

  html = cambiar(html,
    'sessionStorage.removeItem(PASSWORD_KEY);',
    "sessionStorage.removeItem(PASSWORD_KEY);\n" +
    "            sessionStorage.removeItem(ACTIVIDAD_KEY);\n" +
    "            try { localStorage.removeItem(LLAVE_CACHE); } catch (e) {}   // no dejar ventas guardadas en el equipo",
    'cerrar sesión');

  html = cambiar(html,
    "return sessionStorage.getItem(PASSWORD_KEY) || '';",
    "const ultimaActividad = Number(sessionStorage.getItem(ACTIVIDAD_KEY) || 0);\n" +
    "            if (ultimaActividad && Date.now() - ultimaActividad > MINUTOS_INACTIVIDAD * 60000) {\n" +
    "                setTimeout(expirarSesion, 0);\n" +
    "                return '';\n" +
    "            }\n" +
    "            return sessionStorage.getItem(PASSWORD_KEY) || '';",
    'leer clave');

  html = cambiar(html,
    "window.addEventListener('resize', reposicionarGlider);",
    "window.addEventListener('resize', reposicionarGlider);\n\n" +
    "        /* ---- seguridad:capa1 · cierre por inactividad ---- */\n" +
    "        let _expirando = false;\n" +
    "        function expirarSesion() {\n" +
    "            if (_expirando) return;\n" +
    "            _expirando = true;\n" +
    "            try { cerrarSesion(); } catch (e) {}\n" +
    "            const er = document.getElementById('errorLogin');\n" +
    "            if (er) { er.textContent = 'Por seguridad, la sesión se cerró por inactividad. Entra de nuevo.'; er.className = 'msg msg-warn'; }\n" +
    "            setTimeout(() => { _expirando = false; }, 1000);\n" +
    "        }\n" +
    "        const marcarActividad = () => { if (sessionStorage.getItem(PASSWORD_KEY)) sessionStorage.setItem(ACTIVIDAD_KEY, String(Date.now())); };\n" +
    "        let _ultimoToque = 0;\n" +
    "        ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach((ev) => window.addEventListener(ev, () => {\n" +
    "            const t = Date.now();\n" +
    "            if (t - _ultimoToque > 15000) { _ultimoToque = t; marcarActividad(); }\n" +
    "        }, { passive: true, capture: true }));\n" +
    "        setInterval(() => { if (sessionStorage.getItem(PASSWORD_KEY)) obtenerPassword(); }, 30000);\n" +
    "        document.addEventListener('visibilitychange', () => { if (!document.hidden && sessionStorage.getItem(PASSWORD_KEY)) obtenerPassword(); });\n" +
    "        if (sessionStorage.getItem(PASSWORD_KEY) && !sessionStorage.getItem(ACTIVIDAD_KEY)) marcarActividad();",
    'bloque de inactividad');
  return { html };
}

// ------------------------------------------------------------------ CAPA 2 · cabeceras
const RE_CSP = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/;

function capa2(html, ctx) {
  // 1) Endurecer la CSP del <meta> (frame-ancestors no funciona en <meta>; va en _headers)
  html = cambiar(html,
    "connect-src 'self' https:; frame-ancestors 'self';",
    "connect-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self';",
    'CSP del meta');
  html = html.replace('<head>', '<head>\n<!-- seguridad:capa2 -->');

  // 2) Armar el archivo _headers con la misma política + frame-ancestors
  const m = html.match(RE_CSP);
  if (!m) throw new Error('No encontré la etiqueta de CSP después del cambio.');
  const csp = m[1].trim().replace(/;$/, '') + "; frame-ancestors 'none'";
  const bloque =
    '# >>> seguridad:capa2 (no borres esta línea)\n' +
    '/*\n' +
    '  X-Content-Type-Options: nosniff\n' +
    '  Referrer-Policy: no-referrer\n' +
    '  Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=(), usb=()\n' +
    '  Strict-Transport-Security: max-age=31536000\n' +
    '  Cross-Origin-Opener-Policy: same-origin\n' +
    '\n' +
    '/admin\n' +
    '  Content-Security-Policy: ' + csp + '\n' +
    '  X-Frame-Options: DENY\n' +
    '  Cache-Control: no-store\n' +
    '\n' +
    '/admin.html\n' +
    '  Content-Security-Policy: ' + csp + '\n' +
    '  X-Frame-Options: DENY\n' +
    '  Cache-Control: no-store\n' +
    '\n' +
    '/api/*\n' +
    '  Cache-Control: no-store\n' +
    '# <<< seguridad:capa2\n';
  return { html, archivos: [{ ruta: path.join(ctx.carpeta, '_headers'), bloque, marca: '# >>> seguridad:capa2' }] };
}

// ------------------------------------------------------------------ CAPA 3 · XSS en atributos
function capa3(html) {
  // escapeHTML no escapaba comillas: un nombre con " rompía el atributo donde se pintaba
  html = cambiarRegex(html,
    /return div\.innerHTML;/,
    "return div.innerHTML.replace(/\"/g, '&quot;').replace(/'/g, '&#39;');   /* seguridad:capa3 */",
    'escapeHTML');
  // Los ids iban pegados dentro del texto del onclick ('${id}'); ahora viajan en data-id
  html = cambiar(html,
    `onclick="marcarFiadoPagado('\${idAttr}')"`,
    `data-id="\${idAttr}" onclick="marcarFiadoPagado(this.dataset.id)"`,
    'botón marcar fiado pagado');
  html = cambiar(html,
    `onclick="eliminarGasto('\${idAttr}')"`,
    `data-id="\${idAttr}" onclick="eliminarGasto(this.dataset.id)"`,
    'botón eliminar gasto');
  return { html };
}

const CAPAS = { capa1, capa2, capa3 };

// ------------------------------------------------------------------ ejecución
function aplicarCapa(id, rutaAdmin) {
  const original = fs.readFileSync(rutaAdmin, 'utf8');
  const crlf = original.includes('\r\n');
  let html = original.replace(/\r\n/g, '\n');
  const marca = MARCAS[id];

  if (html.includes(marca) || html.includes('/* ' + marca + ' */') || html.includes('<!-- ' + marca + ' -->')) {
    console.log(`• ${id}: ya estaba aplicada, la salto.`);
    return true;
  }
  let resultado;
  try {
    resultado = CAPAS[id](html, { carpeta: path.dirname(rutaAdmin) });
  } catch (e) {
    console.log(`✗ ${id}: NO se cambió nada. ${e.message}`);
    console.log('  Probablemente tu admin.html cambió desde que hice este script. Pásame la línea que falló.');
    return false;
  }

  const copia = `${rutaAdmin}.respaldo-${id}-${sello()}`;
  fs.copyFileSync(rutaAdmin, copia);
  fs.writeFileSync(rutaAdmin, crlf ? resultado.html.replace(/\n/g, '\r\n') : resultado.html, 'utf8');
  console.log(`✓ ${id}: aplicada. Respaldo: ${path.basename(copia)}`);

  for (const a of resultado.archivos || []) {
    let previo = fs.existsSync(a.ruta) ? fs.readFileSync(a.ruta, 'utf8') : '';
    if (previo && !previo.includes(a.marca)) {
      fs.copyFileSync(a.ruta, `${a.ruta}.respaldo-${id}-${sello()}`);
      previo = previo.replace(/\s*$/, '\n\n');
    }
    if (previo.includes(a.marca)) { console.log(`  · ${path.basename(a.ruta)} ya tenía el bloque de ${id}.`); continue; }
    fs.writeFileSync(a.ruta, previo + a.bloque, 'utf8');
    console.log(`  · ${path.basename(a.ruta)} escrito en ${path.dirname(a.ruta)}`);
  }
  return true;
}

function deshacer(rutaAdmin) {
  const dir = path.dirname(rutaAdmin), base = path.basename(rutaAdmin);
  const lista = fs.readdirSync(dir).filter((f) => f.startsWith(base + '.respaldo-')).sort();
  if (!lista.length) { console.log('No hay respaldos junto a ' + base); return; }
  const ultimo = lista[lista.length - 1];
  fs.copyFileSync(path.join(dir, ultimo), rutaAdmin);
  fs.unlinkSync(path.join(dir, ultimo));
  console.log(`✓ Restaurado desde ${ultimo}. (El archivo _headers, si lo creó la capa 2, bórralo o quita su bloque a mano.)`);
}

function ayuda() {
  console.log(`
Lo que NO puede hacer este script (se hace en Cloudflare, una sola vez):

 1. SSL/TLS → Resumen → modo "Full (strict)".  Certificados de borde → "Always Use HTTPS" activado.
 2. Seguridad → Bots → "Bot Fight Mode" activado.
 3. Seguridad → WAF → Reglas de límite de peticiones: una regla para la ruta /api/admin-pedidos
    (ajusta el límite a lo que permita tu plan).
 4. Seguridad → WAF → Regla personalizada: bloquear si la ruta empieza por /api/admin-pedidos
    y el método NO es POST.
 5. Workers y Pages → tu proyecto → Configuración: revisa que las variables y secretos
    (la clave del panel) estén como "Secreto" y no como texto.
 6. Después de publicar, abre https://securityheaders.com con tu dominio para comprobar las cabeceras.

Lo que falta y necesita ver el backend (functions/api/admin-pedidos.js):
 · Capa 4: token de sesión con vencimiento en vez de mandar la clave en cada petición.
 · Capa 5: roles (administrador / vendedor) y que el servidor calcule los totales.
`);
}

function main() {
  const [cmd = 'ayuda', ruta] = process.argv.slice(2);
  const c = cmd.toLowerCase();
  if (c === 'ayuda' || c === '-h' || c === '--help') return ayuda();

  const admin = buscarAdmin(ruta);
  if (!admin) { console.log('No encontré admin.html. Ejecuta esto en la carpeta del proyecto o pasa la ruta:\n  node integrar-seguridad.js capa1 ruta/admin.html'); process.exit(1); }
  console.log('Archivo: ' + admin);

  if (c === 'deshacer') return deshacer(admin);
  const lista = c === 'todas' ? ['capa1', 'capa2', 'capa3'] : [c];
  for (const id of lista) {
    if (!CAPAS[id]) { console.log('No conozco "' + id + '". Usa capa1, capa2, capa3, todas, deshacer o ayuda.'); process.exit(1); }
    if (!aplicarCapa(id, admin)) process.exit(1);
  }
  if (c !== 'todas') console.log('Listo. Prueba el panel (entrar, vender, salir) antes de seguir con la próxima capa.');
}
main();