#!/usr/bin/env node
'use strict';
/**
 * separar-capas.js · ValeraSport
 *
 * Toma el admin.html (todo en un archivo) y lo reparte en capas:
 *
 *   admin-app/
 *   ├── Config/         constantes y versión
 *   ├── Seguridad/      sanitizar, sesión, bloqueo de login, red segura, anti-abuso
 *   ├── Negocio/        reglas y cálculos (carrito, vuelto, fechas, reportes...)
 *   ├── Datos/          llamadas a /api/... (pedidos, ventas, fiados, gastos, catálogo)
 *   ├── Presentacion/   vistas, menús, escáner, módulos y /estilos
 *   └── main/           arranque.js (punto de entrada) + manifiesto.json
 *
 * Uso (desde la carpeta donde está admin.html):
 *   node separar-capas.js                      -> crea admin-app/ y admin.capas.html
 *   node separar-capas.js --reemplazar         -> además deja admin.html nuevo (guarda admin.original.html)
 *   node separar-capas.js ruta/admin.html      -> otra ruta de entrada
 *   Opciones: --carpeta=admin-app   --base=/admin-app/   (URL desde la que se sirven los archivos)
 *
 * No modifica la lógica: mueve el código tal cual, en el mismo orden de ejecución.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const REEMPLAZAR = flags.includes('--reemplazar');
const ENTRADA = path.resolve(args.find((a) => !a.startsWith('--')) || 'admin.html');
const CARPETA = (flags.find((f) => f.startsWith('--carpeta=')) || '--carpeta=admin-app').slice(10);
let BASE = (flags.find((f) => f.startsWith('--base=')) || '').slice(7) || CARPETA + '/';
if (BASE.startsWith('/')) BASE = BASE.slice(1);
if (!BASE.endsWith('/')) BASE += '/';
const DIR = path.dirname(ENTRADA);
const SALIDA = path.join(DIR, CARPETA);

/* =====================================================================
   1. A QUÉ ARCHIVO VA CADA FUNCIÓN / VARIABLE DEL SCRIPT PRINCIPAL
   ===================================================================== */
const MAPA_TXT = {
  'Config/constantes.js': 'PASSWORD_KEY ACTIVIDAD_KEY MINUTOS_INACTIVIDAD INTERVALO_REFRESCO LLAVE_CACHE',
  'Config/version.js': 'HISTORIAL_VERSIONES VERSION_SISTEMA',

  'Seguridad/sanitizar.js': 'escapeHTML',
  'Seguridad/sesion.js': 'obtenerPassword expirarSesion marcarActividad _expirando _ultimoToque',

  'Negocio/estado.js': 'tabActiva subtabPedidosActiva idSolicitudPedidos peticionPedidosEnCurso productosCatalogo scannerVentaStream scannerVentaRAF carritoFisica aplicarDescuentoMayor ultimoIndiceEscaneado ultimoCodigoEscaneado ultimoEscaneoTiempo scannerVentaPausado scannerVentaTimeoutId itemPendienteConfirmar filtroVentas fechaVentasElegida filtroMonedaVentas listaVentasMemoria tasaBcvAdmin ultimoTotalHoy filtroFiados listaFiadosMemoria filtroGastos listaGastosMemoria semanasVisibles vvModo vvAutoBs vvUltimaTasa VV_ELECTRONICOS',
  'Negocio/pagos.js': 'METODOS_USD esMetodoUsd esVentaCashea',
  'Negocio/fechas.js': 'inicioDeSemana claveSemana etiquetaSemana rangoSemana diasEntreFechas estadoFiado fechaLocalISO fechaDesdeISO formatearFechaVersion',
  'Negocio/ventas-calculo.js': 'calcularTotalesPorMoneda agruparVentas repMontoVenta',
  'Negocio/catalogo.js': 'parseCSV normalizarCategoria',
  'Negocio/carrito.js': 'contarTotalPiezasFisica calcularResumenCarritoFisica setAplicarDescuento toggleDescuentoMayor actualizarPrecioItemFisica agregarItemCarritoFisica modificarCantidadItem quitarItemCarritoFisica vaciarCarritoFisica modificarCantidadUltimoEscaneado',
  'Negocio/vuelto.js': 'vvEl vvActivo vvNum vvFmtBs vvFmtUsd vvTasa vvMetodo vvTotal vvBilletes vvCuenta vvTextoVuelto',
  'Negocio/reportes.js': 'NOMBRE_NEGOCIO repBs repUsd repTextoDia rangoReporte',
  'Negocio/cache.js': 'guardarCache',
  'Negocio/sincronizacion.js': 'cargarTodo',
  'Negocio/venta-fisica.js': 'registrarVentaFisica',

  'Datos/auth.js': 'probarPassword',
  'Datos/pedidos.js': 'cargarPedidos cargarAceptadas cargarRechazadas responderOrden rechazarTodosPendientes',
  'Datos/ventas.js': 'cargarVentas vaciarTodasLasVentasAdmin',
  'Datos/fiados.js': 'cargarResumenFiadosVencidos cargarFiados marcarFiadoPagado',
  'Datos/gastos.js': 'cargarGastos registrarGasto eliminarGasto',
  'Datos/catalogo.js': 'cargarProductosCatalogo cargarTasaBcvAdmin',

  'Presentacion/login.js': 'formLogin inputPassword errorLogin pantallaLogin panelPrincipal btnSubmitLogin textoBtnLogin spinnerLogin estadoCargandoLogin textoEstadoCargando setEstadoCargaLogin',
  'Presentacion/panel.js': 'reposicionarGlider mostrarPanel cerrarSesion marcarActualizado renderizarHeroVendidoHoy',
  'Presentacion/version.js': 'renderizarVersiones pintarVersion',
  'Presentacion/navegacion-tabs.js': 'cambiarTabPedidos cambiarSubtabPedidos cargarSubtabPedidosActiva inicializarAcordeonesOrdenes refrescarManual',
  'Presentacion/pedidos-vista.js': 'renderizarPedidos actualizarBadgesPedidos tarjetaOrden',
  'Presentacion/ventas-vista.js': 'filtrarVentasVista filtrarMonedaVentas renderizarListaVentas renderizarSemanas toggleSemanas formatearEncabezadoFechaVenta tarjetaVenta tarjetaVentaGrupo',
  'Presentacion/fiados-vista.js': 'filtrarFiadosVista renderizarListaFiados tarjetaFiado',
  'Presentacion/gastos-vista.js': 'toggleFormularioGasto filtrarGastosVista renderizarListaGastos tarjetaGasto',
  'Presentacion/venta-vista.js': 'alCambiarMetodoPagoFisica poblarDatalistProductos buscarProductoEscrito aplicarCoincidenciaProducto actualizarPrecioBsFisica',
  'Presentacion/carrito-vista.js': 'manejarEnterPrecioItem editarPrecioItemFisica actualizarMiniStepperScanner renderizarCarritoFisica',
  'Presentacion/vuelto-vista.js': 'vvRellenarBsExacto vvAlActivar vvCambioMetodo vvCambioTasa vvAlEscribirUsd vvAlEscribirBs vvPonerUsd vvPonerBs vvSetModo vvLimpiar vvRenderAtajosBs vvCalcular',
  'Presentacion/escaner.js': 'emitirFeedbackEscaneo abrirScannerVenta tickScannerVenta cerrarScannerVenta procesarCodigoQRVenta mostrarModalRepetido ocultarModalRepetido confirmarRepetidoScanner cancelarRepetidoScanner registrarVentaDesdeScanner',
  'Presentacion/pantallas.js': 'PANELES_ACCION pantallaAccionAbierta mostrarPantallaAccion abrirPanelAccion toggleFormularioFisica toggleFormularioQR',
  'Presentacion/qr.js': 'generarQRNuevo imprimirQR',
  'Presentacion/menu-acciones.js': 'avAbrir avElegir',
  'Presentacion/reportes.js': 'iniciarReporte repAlCambiarModo reportePreset descargarReporte generarPDFVentas',
};
const DESTINO = {};
Object.keys(MAPA_TXT).forEach((rel) => MAPA_TXT[rel].split(/\s+/).forEach((n) => { DESTINO[n] = rel; }));

// Orden de carga = orden de dependencias: Config → Seguridad → Negocio → Datos → Presentacion → main
const ORDEN = [
  'Config/constantes.js', 'Config/version.js',
  'Seguridad/sanitizar.js', 'Seguridad/sesion.js',
  'Negocio/estado.js', 'Negocio/pagos.js', 'Negocio/fechas.js', 'Negocio/ventas-calculo.js', 'Negocio/catalogo.js',
  'Negocio/carrito.js', 'Negocio/vuelto.js', 'Negocio/reportes.js', 'Negocio/cache.js', 'Negocio/sincronizacion.js',
  'Negocio/venta-fisica.js', 'Negocio/otros.js',
  'Datos/auth.js', 'Datos/pedidos.js', 'Datos/ventas.js', 'Datos/fiados.js', 'Datos/gastos.js', 'Datos/catalogo.js', 'Datos/otros.js',
  'Presentacion/login.js', 'Presentacion/panel.js', 'Presentacion/version.js', 'Presentacion/navegacion-tabs.js',
  'Presentacion/pedidos-vista.js', 'Presentacion/ventas-vista.js', 'Presentacion/fiados-vista.js', 'Presentacion/gastos-vista.js',
  'Presentacion/venta-vista.js', 'Presentacion/carrito-vista.js', 'Presentacion/vuelto-vista.js', 'Presentacion/escaner.js',
  'Presentacion/pantallas.js', 'Presentacion/qr.js', 'Presentacion/menu-acciones.js', 'Presentacion/reportes.js', 'Presentacion/otros.js',
  'main/arranque.js',
];

/* =====================================================================
   2. LECTOR DE JAVASCRIPT (para cortar el script grande en sentencias)
   ===================================================================== */
const PALABRAS_ANTES_DE_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do']);

function regexPermitido(ctx) {
  if (ctx.t === 'inicio') return true;
  if (ctx.t === 'punct') return !(ctx.v === ')' || ctx.v === ']' || ctx.v === '}');
  if (ctx.t === 'word') return PALABRAS_ANTES_DE_REGEX.has(ctx.v);
  return false;
}

function leerToken(s, i, ctx) {
  const c = s[i], d = s[i + 1];
  if (/\s/.test(c)) { let j = i + 1; while (j < s.length && /\s/.test(s[j])) j++; return [j, 'ws']; }
  if (c === '/' && d === '/') { const j = s.indexOf('\n', i); return [j === -1 ? s.length : j, 'comment']; }
  if (c === '/' && d === '*') {
    const j = s.indexOf('*/', i + 2);
    if (j === -1) throw new Error('Comentario sin cerrar');
    return [j + 2, 'comment'];
  }
  if (c === '"' || c === "'") {
    let j = i + 1;
    while (j < s.length && s[j] !== c) { if (s[j] === '\\') j++; j++; }
    return [j + 1, 'str'];
  }
  if (c === '`') return [finPlantilla(s, i + 1), 'str'];
  if (c === '/' && regexPermitido(ctx)) {
    let j = i + 1, clase = false;
    while (j < s.length) {
      const x = s[j];
      if (x === '\\') { j += 2; continue; }
      if (x === '[') clase = true;
      else if (x === ']') clase = false;
      else if (x === '/' && !clase) break;
      else if (x === '\n') throw new Error('Regex sin cerrar');
      j++;
    }
    j++;
    while (j < s.length && /[a-z]/i.test(s[j])) j++;
    return [j, 'regex'];
  }
  if (/[A-Za-z_$]/.test(c)) { let j = i + 1; while (j < s.length && /[\w$]/.test(s[j])) j++; return [j, 'word']; }
  if (/[0-9]/.test(c)) { let j = i + 1; while (j < s.length && /[\w.]/.test(s[j])) j++; return [j, 'num']; }
  return [i + 1, 'punct'];
}

function finPlantilla(s, i) {
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '`') return i + 1;
    if (c === '$' && s[i + 1] === '{') { i = finBloque(s, i + 2); continue; }
    i++;
  }
  throw new Error('Plantilla sin cerrar');
}

function finBloque(s, i) {
  let prof = 1;
  let ctx = { t: 'punct', v: '{' };
  while (i < s.length) {
    const [j, t] = leerToken(s, i, ctx);
    const txt = s.slice(i, j);
    if (t === 'punct') {
      if (txt === '{') prof++;
      else if (txt === '}') { prof--; if (!prof) return j; }
    }
    if (t !== 'ws' && t !== 'comment') ctx = { t, v: txt };
    i = j;
  }
  throw new Error('Bloque sin cerrar');
}

function siguientePalabra(s, i) {
  let ctx = { t: 'punct', v: '}' };
  while (i < s.length) {
    const [j, t] = leerToken(s, i, ctx);
    if (t === 'ws' || t === 'comment') { i = j; continue; }
    return t === 'word' ? s.slice(i, j) : '';
  }
  return '';
}

const INICIOS_DE_BLOQUE = new Set(['function', 'class', 'if', 'for', 'while', 'try', 'switch']);
const esBloque = (p) => INICIOS_DE_BLOQUE.has(p[0]) || (p[0] === 'async' && p[1] === 'function');

// Corta el script en sentencias de primer nivel (cada una con sus comentarios de arriba)
function dividirSentencias(src) {
  const sents = [];
  let i = 0, inicio = 0, prof = 0, hay = false, cortado = false;
  let palabras = [];
  let ctx = { t: 'inicio', v: '' };
  const cerrar = (fin) => {
    sents.push({ texto: src.slice(inicio, fin), palabras: palabras.slice() });
    inicio = fin; prof = 0; hay = false; cortado = false; palabras = [];
    ctx = { t: 'inicio', v: '' };
  };
  while (i < src.length) {
    const [j, t] = leerToken(src, i, ctx);
    const txt = src.slice(i, j);
    if (t === 'ws' || t === 'comment') { i = j; continue; }
    hay = true;
    if (!cortado && prof === 0) {
      if (t === 'word' && palabras.length < 3) palabras.push(txt); else cortado = true;
    }
    if (t === 'punct') {
      if (txt === '(' || txt === '[' || txt === '{') prof++;
      else if (txt === ')' || txt === ']' || txt === '}') {
        prof--;
        if (prof === 0 && txt === '}' && esBloque(palabras)) {
          const prox = siguientePalabra(src, j);
          if (prox !== 'else' && prox !== 'catch' && prox !== 'finally') { cerrar(j); i = j; continue; }
        }
      } else if (txt === ';' && prof === 0) { cerrar(j); i = j; continue; }
    }
    ctx = { t, v: txt };
    i = j;
  }
  const resto = src.slice(inicio);
  if (resto.trim()) {
    if (hay) {
      if (prof !== 0) throw new Error('Llaves o paréntesis sin cerrar al final del script');
      sents.push({ texto: resto, palabras });
    } else if (sents.length) sents[sents.length - 1].texto += resto;
  }

  return sents;
}

function describir(sent) {
  const p = sent.palabras;
  if (p[0] === 'function') return { tipo: 'decl', nombre: p[1] };
  if (p[0] === 'async' && p[1] === 'function') return { tipo: 'decl', nombre: p[2] };
  if (p[0] === 'const' || p[0] === 'let' || p[0] === 'var') return { tipo: 'decl', nombre: p[1] };
  if (p[0] === 'class') return { tipo: 'decl', nombre: p[1] };
  return { tipo: 'exec', nombre: null };
}

// Si un nombre no está en el mapa, se adivina por lo que hace
function adivinarArchivo(texto) {
  if (/\bfetch\s*\(/.test(texto)) return 'Datos/otros.js';
  if (/document\.|innerHTML|getElementById|classList/.test(texto)) return 'Presentacion/otros.js';
  return 'Negocio/otros.js';
}

/* =====================================================================
   3. REESCRIBIR EL HTML
   ===================================================================== */
const archivos = new Map(); // ruta relativa -> contenido
const avisos = [];
const sinClasificar = [];

const encabezado = (rel) => `/* ${rel} · generado por separar-capas.js · el código está igual que en admin.html */\n`;
function guardar(rel, contenido) {
  const txt = archivos.has(rel) ? archivos.get(rel) + '\n' + contenido : encabezado(rel) + contenido;
  archivos.set(rel, txt);
}
const tagJs = (rel, sync) => `<script ${sync ? '' : 'defer '}src="${BASE}${rel}"></script>`;
const tagCss = (rel) => `<link rel="stylesheet" href="${BASE}${rel}">`;

const ESTILOS_POR_ID = {
  'rediseno-v4': 'Presentacion/estilos/rediseno-v4.css',
  'vs-core-css': 'Presentacion/estilos/nucleo.css',
  'vsv-css': 'Presentacion/estilos/venta-simple.css',
  'vsv2-css': 'Presentacion/estilos/venta-autosuma.css',
  'vsi-css': 'Presentacion/estilos/inventario.css',
  'vsx-css': 'Presentacion/estilos/plegables-fechas.css',
  'sec-capa2-css': 'Presentacion/estilos/privacidad.css',
};
const MODULOS_POR_ID = {
  'vs-core': 'Presentacion/modulos/nucleo.js',
  'vsv-js': 'Presentacion/modulos/venta-simple.js',
  'vsv2-js': 'Presentacion/modulos/venta-autosuma.js',
  'vsi-js': 'Presentacion/modulos/inventario.js',
  'vsx-js': 'Presentacion/modulos/ventas-por-dia.js',
  'vse-js': 'Presentacion/modulos/editar-ventas.js',
  'vsimg-js': 'Presentacion/modulos/imagenes-producto.js',
};

function idDe(attrs) { const m = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i); return m ? m[1] : ''; }

function procesarStyle(attrs, css, enBody, contador) {
  const id = idDe(attrs);
  if (id === 'sec-antiframe-css') return null; // debe quedar en línea (evita el parpadeo del anti-iframe)
  let rel = ESTILOS_POR_ID[id];
  const extra = [];
  if (!rel) {
    if (/--noche\s*:/.test(css)) rel = 'Presentacion/estilos/base.css';
    else if (/\.vv-switch/.test(css)) rel = 'Presentacion/estilos/vuelto.css';
    else { rel = `Presentacion/estilos/estilo-${contador}.css`; avisos.push(`Un <style> sin id se guardó como ${rel}`); }
  }
  let cuerpo = css;
  if (rel.endsWith('base.css')) { // el logo en base64 pesa muchísimo: va a su propio archivo
    const m = cuerpo.match(/:root\s*\{\s*--logo-url\s*:\s*url\("data:image\/[a-z]+;base64,[^"]+"\)\s*\}/);
    if (m) {
      guardar('Presentacion/estilos/logo-variable.css', m[0] + '\n');
      cuerpo = cuerpo.replace(m[0], '');
      extra.push('Presentacion/estilos/logo-variable.css');
    }
  }
  guardar(rel, cuerpo.trim() + '\n');
  return [rel].concat(extra).map(tagCss).join('\n');
}

function procesarScript(attrs, cuerpo, ctxMain) {
  const id = idDe(attrs);
  if (/Storage\.prototype/.test(cuerpo) && /vs_admin_password/.test(cuerpo)) {
    guardar('Seguridad/memoria-sesion.js', cuerpo.trim() + '\n');
    return tagJs('Seguridad/memoria-sesion.js', true); // síncrono: tiene que correr antes que todo
  }
  if (/window\.self\s*===\s*window\.top/.test(cuerpo)) return null; // anti-iframe: se queda en línea
  if (/const\s+PASSWORD_KEY\b/.test(cuerpo)) return ctxMain(cuerpo);

  if (MODULOS_POR_ID[id]) {
    const rel = MODULOS_POR_ID[id];
    let cod = cuerpo, tags = '';
    const m = cod.match(/\}\)\(\s*"(data:image\/png;base64,[A-Za-z0-9+\/=]+)"\s*\)\s*;?\s*$/);
    if (m) { // logo del PDF: a su propio archivo
      guardar('Presentacion/assets/logo-b64.js', 'window.VS_LOGO_B64 = "' + m[1] + '";\n');
      cod = cod.slice(0, m.index) + '})(window.VS_LOGO_B64);';
      tags = tagJs('Presentacion/assets/logo-b64.js') + '\n';
    }
    guardar(rel, cod.trim() + '\n');
    return tags + tagJs(rel);
  }
  const porFirma = [
    [/MAX_INTENTOS/, 'Seguridad/login-bloqueo.js'],
    [/OK_IMG/, 'Seguridad/interfaz-segura.js'],
    [/TIMEOUT\s*=\s*25/, 'Seguridad/red-segura.js'],
    [/VENTANA\s*=\s*10000/, 'Seguridad/anti-abuso.js'],
  ];
  for (const [re, rel] of porFirma) {
    if (re.test(cuerpo)) { guardar(rel, cuerpo.trim() + '\n'); return tagJs(rel); }
  }
  const rel = `Presentacion/modulos/extra-${++procesarScript.n}.js`;
  avisos.push(`Un <script> sin identificar se guardó como ${rel} (mantiene su posición)`);
  guardar(rel, cuerpo.trim() + '\n');
  return tagJs(rel);
}
procesarScript.n = 0;

// Reparte el script grande por capas
function repartirPrincipal(src) {
  const sents = dividirSentencias(src);
  const porArchivo = new Map();
  const poner = (rel, txt) => { if (!porArchivo.has(rel)) porArchivo.set(rel, []); porArchivo.get(rel).push(txt); };
  let nDecl = 0, nExec = 0;
  sents.forEach((s) => {
    const d = describir(s);
    if (d.tipo === 'exec') { poner('main/arranque.js', s.texto); nExec++; return; }
    let rel = DESTINO[d.nombre];
    if (!rel) { rel = adivinarArchivo(s.texto); sinClasificar.push(`${d.nombre || '(sin nombre)'} → ${rel}`); }
    poner(rel, s.texto);
    nDecl++;
  });
  const orden = ORDEN.filter((r) => porArchivo.has(r));
  porArchivo.forEach((_, r) => { if (!orden.includes(r)) orden.push(r); });
  orden.forEach((rel) => guardar(rel, porArchivo.get(rel).join('').replace(/^\s*\n/, '') .trimEnd() + '\n'));

  const capaDe = (r) => r.split('/')[0];
  let ultima = '', out = [];
  orden.forEach((rel) => {
    if (capaDe(rel) !== ultima) { ultima = capaDe(rel); out.push(`<!-- ===== Capa: ${ultima} ===== -->`); }
    out.push(tagJs(rel));
  });
  console.log(`  script principal: ${nDecl} declaraciones + ${nExec} instrucciones de arranque → ${orden.length} archivos`);
  return out.join('\n');
}

function reescribir(html) {
  const re = /<(script|style)\b([^>]*)>/gi;
  const idxBody = html.search(/<body\b/i);
  let salida = '', pos = 0, m, nStyle = 0;
  const cssDelBody = [];
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    const cierre = new RegExp('</' + tag + '\\s*>', 'gi');
    cierre.lastIndex = re.lastIndex;
    const mc = cierre.exec(html);
    if (!mc) throw new Error('Etiqueta <' + tag + '> sin cerrar cerca de la posición ' + m.index);
    const finBloque = mc.index + mc[0].length;
    const cuerpo = html.slice(re.lastIndex, mc.index);
    if (tag === 'script' && /\bsrc\s*=/.test(attrs)) { re.lastIndex = finBloque; continue; } // librerías externas: quedan igual

    let reemplazo;
    if (tag === 'style') {
      reemplazo = procesarStyle(attrs, cuerpo, m.index > idxBody, ++nStyle);
      if (reemplazo !== null && m.index > idxBody) { cssDelBody.push(reemplazo); reemplazo = ''; }
    } else {
      reemplazo = procesarScript(attrs, cuerpo, repartirPrincipal);
    }
    if (reemplazo !== null) {
      salida += html.slice(pos, m.index) + reemplazo;
      pos = finBloque;
    }
    re.lastIndex = finBloque;
  }
  salida += html.slice(pos);
  if (cssDelBody.length) salida = salida.replace(/<\/head>/i, cssDelBody.join('\n') + '\n</head>');
  return salida;
}

/* =====================================================================
   4. EJECUCIÓN
   ===================================================================== */
function fallo(msg) { console.error('\n✖ ' + msg + '\n'); process.exit(1); }

if (!fs.existsSync(ENTRADA)) fallo('No encuentro ' + ENTRADA + '\n  Ejecuta el script en la carpeta de admin.html o pásale la ruta.');
console.log('Leyendo ' + ENTRADA);
const original = fs.readFileSync(ENTRADA, 'utf8');

let nuevoHtml;
try { nuevoHtml = reescribir(original); } catch (e) { fallo('No se pudo separar: ' + e.message); }

// Revisión: cada archivo JS tiene que compilar (sin ejecutarse)
const errores = [];
archivos.forEach((txt, rel) => {
  if (!rel.endsWith('.js')) return;
  try { new vm.Script(txt, { filename: rel }); } catch (e) { errores.push(rel + ' → ' + e.message); }
});
if (errores.length) fallo('Estos archivos salieron con errores de sintaxis, no se escribió nada:\n  - ' + errores.join('\n  - '));

// Manifiesto de carga (sirve para cargar por capas más adelante)
const ordenFinal = [...archivos.keys()].filter((r) => r.endsWith('.js'));
archivos.set('main/manifiesto.json', JSON.stringify({ base: BASE, orden: ordenFinal }, null, 2) + '\n');

fs.mkdirSync(SALIDA, { recursive: true });
archivos.forEach((txt, rel) => {
  const destino = path.join(SALIDA, rel);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, txt, 'utf8');
});

const respaldo = path.join(DIR, 'admin.original.html');
if (!fs.existsSync(respaldo)) fs.copyFileSync(ENTRADA, respaldo);
const archivoHtml = REEMPLAZAR ? ENTRADA : path.join(DIR, 'admin.capas.html');
fs.writeFileSync(archivoHtml, nuevoHtml, 'utf8');

// Resumen
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log('\nCarpeta creada: ' + SALIDA);
const porCapa = {};
[...archivos.keys()].sort().forEach((rel) => { const c = rel.split('/')[0]; (porCapa[c] = porCapa[c] || []).push(rel); });
Object.keys(porCapa).forEach((c) => {
  console.log('  ' + c + '/');
  porCapa[c].forEach((rel) => console.log('     ' + rel.slice(c.length + 1).padEnd(40) + kb(Buffer.byteLength(archivos.get(rel)))));
});
console.log('\nHTML original: ' + kb(Buffer.byteLength(original)) + '  →  HTML nuevo: ' + kb(Buffer.byteLength(nuevoHtml)));
console.log('Respaldo: ' + respaldo);
console.log('HTML nuevo: ' + archivoHtml + (REEMPLAZAR ? ' (reemplazó a admin.html)' : '  (pruébalo y luego renómbralo, o usa --reemplazar)'));
if (sinClasificar.length) {
  console.log('\nFunciones que no estaban en el mapa (se clasificaron solas, revisa si quieres moverlas):');
  sinClasificar.forEach((s) => console.log('  · ' + s));
}
avisos.forEach((a) => console.log('Aviso: ' + a));
console.log('\nListo. URL base de los archivos: ' + BASE);