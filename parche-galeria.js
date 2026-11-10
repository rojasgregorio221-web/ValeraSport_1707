#!/usr/bin/env node
/*
 * PARCHE GALERÍA + TONOS DE COLOR · Valera Sport
 *
 * Uso (desde la carpeta de tu proyecto, o pasando la ruta):
 *   node parche-galeria.js
 *   node parche-galeria.js ./public
 *   node parche-galeria.js --revertir        (restaura las copias .bak-vsgal)
 *
 * Qué hace:
 *  1) ADMIN (BaseCash): el campo "Imagen (URL)" acepta VARIAS fotos
 *     (una por línea o separadas por espacio) y muestra vista previa de todas.
 *  2) CATÁLOGO: carrusel deslizable en la ficha de la prenda, miniaturas,
 *     contador, y "tonos" reales de cada color (ficha y tarjetas).
 *  3) tienda-comun.js (si existe): lee varias URLs en un solo campo.
 *
 * No necesita instalar nada. Crea copia de seguridad (.bak-vsgal) la primera vez.
 * Se puede ejecutar varias veces sin duplicar nada.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const REVERTIR = args.includes('--revertir');
const raiz = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd());
const BAK = '.bak-vsgal';
const IGNORAR = new Set(['node_modules', '.git', '.vercel', '.next', '.cache']);

function recorrer(dir, salida) {
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return salida; }
    for (const e of ents) {
        if (IGNORAR.has(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) recorrer(p, salida);
        else if (/\.html?$/i.test(e.name) || e.name === 'tienda-comun.js') salida.push(p);
    }
    return salida;
}

function leer(p) {
    const crudo = fs.readFileSync(p, 'utf8');
    const crlf = crudo.indexOf('\r\n') !== -1;
    return { txt: crlf ? crudo.replace(/\r\n/g, '\n') : crudo, crlf };
}
function escribir(p, txt, crlf) {
    if (!fs.existsSync(p + BAK)) fs.copyFileSync(p, p + BAK);
    fs.writeFileSync(p, crlf ? txt.replace(/\n/g, '\r\n') : txt, 'utf8');
}

/* ====================================================================
   BLOQUE QUE SE AGREGA A tienda-comun.js
   ==================================================================== */
const BLOQUE_COMUN = String.raw`
/* vsg-lista:inicio */
(function () {
    if (typeof obtenerListaImagenes !== 'function' || obtenerListaImagenes.__vsg) return;
    var original = obtenerListaImagenes;
    function partir(t) {
        return String(t == null ? '' : t).split(/[\s,;|]+/).filter(function (u) {
            return /^(https?:\/\/|\/|imagenes\/)\S+/i.test(u) || /\.(jpe?g|png|webp|gif|avif)(\?\S*)?$/i.test(u);
        });
    }
    var nueva = function (t) {
        var l = partir(t);
        return l.length > 1 ? l : original.apply(this, arguments);
    };
    nueva.__vsg = true;
    try { obtenerListaImagenes = nueva; } catch (e) { window.obtenerListaImagenes = nueva; }
})();
/* vsg-lista:fin */
`;

/* ====================================================================
   BLOQUE QUE SE AGREGA AL CATÁLOGO (antes de </body>)
   ==================================================================== */
const BLOQUE_CATALOGO = String.raw`
<!-- vs-galeria:inicio -->
<style id="vsg-css">
.vs-sw{display:inline-block;width:14px;height:14px;border-radius:50%;flex:none;margin-right:7px;vertical-align:-2px;border:1.5px solid rgba(255,255,255,.9);box-shadow:0 0 0 1px rgba(0,0,0,.28)}
.vs-sws{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-top:9px}
.vs-sws .vs-sw{margin:0;width:13px;height:13px}
.vs-sws small{font-size:10px;font-weight:700;color:var(--gris-claro)}
.vs-nfotos{position:absolute;right:10px;bottom:10px;z-index:3;display:inline-flex;align-items:center;gap:5px;background:rgba(22,19,31,.78);color:#fff;font-size:10px;font-weight:700;padding:4px 9px;border-radius:9999px}
#vsTrack{position:absolute;inset:0;z-index:2;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
#vsTrack::-webkit-scrollbar{display:none}
#vsTrack img{flex:0 0 100%;width:100%;height:100%;object-fit:contain;scroll-snap-align:center;scroll-snap-stop:always;user-select:none;-webkit-user-drag:none}
.vsg-flecha{position:absolute;top:50%;transform:translateY(-50%);z-index:3;width:36px;height:36px;border-radius:50%;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.88);color:#16131F;box-shadow:0 6px 16px -6px rgba(0,0,0,.4);font-size:13px}
.vsg-flecha:active{transform:translateY(-50%) scale(.94)}
#vsPrev{left:8px}#vsNext{right:8px}
#vsCount{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:3;background:rgba(22,19,31,.78);color:#fff;font-size:11px;font-weight:700;padding:4px 11px;border-radius:9999px;font-variant-numeric:tabular-nums}
#detalleGaleria{position:relative;scrollbar-width:thin}
.vsg-th{flex:none;width:56px;height:56px;padding:0;border-radius:12px;overflow:hidden;border:2px solid transparent;background:#fff;cursor:pointer;opacity:.7;transition:opacity .2s,border-color .2s}
.vsg-th img{width:100%;height:100%;object-fit:cover;display:block}
.vsg-th.on{border-color:var(--fucsia);opacity:1}
</style>
<script id="vsg-js">
(function () {
    'use strict';
    if (window.VSG) return;
    window.VSG = {};
    var $ = function (id) { return document.getElementById(id); };
    var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

    /* ---------- 1. Partir varias URLs en un solo texto ---------- */
    function partir(t) {
        return String(t == null ? '' : t).split(/[\s,;|]+/).filter(function (u) {
            return /^(https?:\/\/|\/|imagenes\/)\S+/i.test(u) || /\.(jpe?g|png|webp|gif|avif)(\?\S*)?$/i.test(u);
        });
    }
    window.VSG.partir = partir;

    if (typeof obtenerListaImagenes === 'function' && !obtenerListaImagenes.__vsg) {
        var original = obtenerListaImagenes;
        var nueva = function (t) { var l = partir(t); return l.length > 1 ? l : original.apply(this, arguments); };
        nueva.__vsg = true;
        try { obtenerListaImagenes = nueva; } catch (e) { window.obtenerListaImagenes = nueva; }
    }

    /* ---------- 2. Tonos de color ---------- */
    var BASE = {
        negro: '#111111', blanco: '#FFFFFF', gris: '#9CA3AF', plomo: '#8A8F98', plateado: '#C0C0C0', grafito: '#3F4350',
        rojo: '#DC2626', vinotinto: '#6D1A2B', vino: '#722F37', guinda: '#7B1E3A', bordo: '#6D1A2B', burgundy: '#7B1E3A',
        rosado: '#F9A8C9', rosa: '#F472B6', fucsia: '#E11D8F', magenta: '#D1177F', ciclamen: '#C2185B',
        naranja: '#F97316', coral: '#FF6F61', salmon: '#FA8072', durazno: '#FDBA8C', melon: '#FDBA74',
        amarillo: '#FACC15', mostaza: '#D4A017', dorado: '#D4AF37', limon: '#BEE33B', neon: '#A3E635',
        beige: '#E8D9BD', crema: '#F5EBD7', hueso: '#F3EEE1', arena: '#D9C3A0', kaki: '#B7A36B', camel: '#C19A6B',
        marron: '#7B4A2A', chocolate: '#4E2A1A', cafe: '#6F4E37',
        verde: '#16A34A', militar: '#4B5320', oliva: '#6B7A2A', menta: '#A7F3D0', esmeralda: '#0F9D6B',
        turquesa: '#14B8A6', aqua: '#22D3EE', celeste: '#7DD3FC',
        azul: '#2563EB', marino: '#14213D', navy: '#14213D', royal: '#1D4ED8', rey: '#1D4ED8', jean: '#5B7DB1', denim: '#5B7DB1',
        morado: '#7C3AED', violeta: '#8B5CF6', lila: '#C4B5FD', lavanda: '#C4B5FD', purpura: '#6D28D9'
    };
    function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
    function mezcla(a, b, t) {
        function h(x) { return [1, 3, 5].map(function (i) { return parseInt(x.substr(i, 2), 16); }); }
        var A = h(a), B = h(b);
        return '#' + A.map(function (v, i) { return ('0' + Math.round(v + (B[i] - v) * t).toString(16)).slice(-2); }).join('');
    }
    function palabra(w) {
        var c = [w, w.replace(/a$/, 'o'), w.replace(/s$/, ''), w.replace(/as$/, 'o'), w.replace(/os$/, 'o')];
        for (var i = 0; i < c.length; i++) if (BASE[c[i]]) return BASE[c[i]];
        return null;
    }
    function uno(p) {
        var hex = null, mod = null;
        p.split(/\s+/).forEach(function (w) {
            var c = palabra(w);
            if (c) hex = c;
            else if (/^(claro|clara|claros|pastel|suave|bebe)$/.test(w)) mod = 'c';
            else if (/^(oscuro|oscura|oscuros|profundo|profunda)$/.test(w)) mod = 'o';
        });
        if (!hex) return null;
        if (mod === 'c') hex = mezcla(hex, '#FFFFFF', 0.5);
        if (mod === 'o') hex = mezcla(hex, '#000000', 0.35);
        return hex;
    }
    function tono(nombre) {
        var t = norm(nombre).replace(/\(.*?\)/g, ' ').replace(/[:\d]+/g, ' ').trim();
        if (!t) return null;
        if (/^(variado|variados|surtido|surtidos|varios|multicolor|multicolores|multi)\b/.test(t))
            return 'conic-gradient(#ef4444,#f59e0b,#facc15,#22c55e,#06b6d4,#6366f1,#d946ef,#ef4444)';
        var cols = t.split(/\s*(?:\/|\+|&|\sy\s)\s*/).filter(Boolean).map(uno).filter(Boolean);
        if (!cols.length) return null;
        if (cols.length === 1) return cols[0];
        var n = cols.length;
        return 'linear-gradient(90deg,' + cols.map(function (c, i) { return c + ' ' + (i * 100 / n) + '% ' + ((i + 1) * 100 / n) + '%'; }).join(',') + ')';
    }
    function coloresDe(txt) {
        var vistos = {}, out = [];
        String(txt || '').split(/[,;]+/).forEach(function (x) {
            var n = x.replace(/:\s*\d+\s*$/, '').replace(/\(.*?\)/g, '').trim();
            if (!n || vistos[norm(n)]) return;
            vistos[norm(n)] = 1;
            out.push({ n: n, bg: tono(n) });
        });
        return out;
    }
    window.VSG.tono = tono;

    // Tarjetas del catálogo: puntitos de color + contador de fotos
    var tarjeta0 = window.crearTarjetaGrid;
    if (typeof tarjeta0 === 'function') {
        window.crearTarjetaGrid = function (p) {
            var h = tarjeta0.apply(this, arguments);
            try {
                var fotos = partir(p && p.imagen).length;
                if (fotos > 1) h = h.replace('<span class="ver-chip">', '<span class="vs-nfotos"><i class="fa-solid fa-images"></i> ' + fotos + '</span><span class="ver-chip">');
                var cols = coloresDe(p && p.colores).filter(function (c) { return c.bg; });
                if (cols.length) {
                    var ver = cols.slice(0, 6).map(function (c) { return '<span class="vs-sw" title="' + esc(c.n) + '" style="background:' + c.bg + '"></span>'; }).join('');
                    if (cols.length > 6) ver += '<small>+' + (cols.length - 6) + '</small>';
                    var k = h.lastIndexOf('</p>');
                    if (k !== -1) h = h.slice(0, k + 4) + '<div class="vs-sws">' + ver + '</div>' + h.slice(k + 4);
                }
            } catch (e) { console.error('[VSG] tarjeta', e); }
            return h;
        };
    }

    // Ficha: tono en cada botón de color
    function pintarColores() {
        var cont = $('detalleColores');
        if (!cont) return;
        Array.prototype.forEach.call(cont.children, function (b) {
            if (b.getAttribute('data-vsg')) return;
            b.setAttribute('data-vsg', '1');
            var bg = tono(b.textContent);
            if (!bg) return;
            var s = document.createElement('span');
            s.className = 'vs-sw';
            s.style.background = bg;
            b.insertBefore(s, b.firstChild);
        });
    }
    var contCol = $('detalleColores');
    if (contCol && window.MutationObserver) new MutationObserver(pintarColores).observe(contCol, { childList: true });

    /* ---------- 3. Carrusel en la ficha ---------- */
    var estado = { imgs: [], idx: 0 };

    function limpiar() {
        ['vsTrack', 'vsPrev', 'vsNext', 'vsCount'].forEach(function (id) { var e = $(id); if (e && e.parentNode) e.parentNode.removeChild(e); });
        var im = $('detalleImagen');
        if (im) im.style.display = '';
        var g = $('detalleGaleria');
        if (g && g.getAttribute('data-vsg')) {
            g.removeAttribute('data-vsg');
            g.innerHTML = '';
            g.style.display = '';
            g.classList.add('hidden');
        }
        estado.imgs = []; estado.idx = 0;
    }

    function marcar(idx) {
        estado.idx = idx;
        var c = $('vsCount');
        if (c) c.textContent = (idx + 1) + ' / ' + estado.imgs.length;
        var g = $('detalleGaleria');
        if (g) {
            Array.prototype.forEach.call(g.querySelectorAll('.vsg-th'), function (t, i) {
                t.classList.toggle('on', i === idx);
                if (i === idx) g.scrollTo({ left: t.offsetLeft - (g.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
            });
        }
        var im = $('detalleImagen');
        if (im && estado.imgs[idx]) im.src = estado.imgs[idx]; // mantiene el fondo difuminado al día
    }

    function ir(i) {
        var t = $('vsTrack');
        if (!t) return;
        var n = estado.imgs.length;
        i = ((i % n) + n) % n;
        t.scrollTo({ left: i * t.clientWidth, behavior: 'smooth' });
    }

    function montar(texto) {
        var imgs = partir(texto);
        if (imgs.length < 2) return;
        var im = $('detalleImagen');
        var marco = im && im.closest ? im.closest('.vs-foto-marco') : null;
        if (!marco) return;
        estado.imgs = imgs; estado.idx = 0;

        var track = document.createElement('div');
        track.id = 'vsTrack';
        imgs.forEach(function (u) {
            var f = document.createElement('img');
            f.src = u; f.alt = ''; f.decoding = 'async'; f.draggable = false;
            f.onerror = function () { this.style.opacity = '.2'; };
            track.appendChild(f);
        });
        marco.appendChild(track);
        im.style.display = 'none';
        im.src = imgs[0];

        var prev = document.createElement('button');
        prev.type = 'button'; prev.id = 'vsPrev'; prev.className = 'vsg-flecha'; prev.setAttribute('aria-label', 'Foto anterior');
        prev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        prev.addEventListener('click', function () { ir(estado.idx - 1); });
        var next = document.createElement('button');
        next.type = 'button'; next.id = 'vsNext'; next.className = 'vsg-flecha'; next.setAttribute('aria-label', 'Foto siguiente');
        next.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        next.addEventListener('click', function () { ir(estado.idx + 1); });
        var cuenta = document.createElement('div');
        cuenta.id = 'vsCount';
        marco.appendChild(prev); marco.appendChild(next); marco.appendChild(cuenta);

        var g = $('detalleGaleria');
        if (g) {
            g.innerHTML = '';
            imgs.forEach(function (u, i) {
                var b = document.createElement('button');
                b.type = 'button'; b.className = 'vsg-th'; b.setAttribute('aria-label', 'Ver foto ' + (i + 1));
                var f = document.createElement('img');
                f.src = u; f.alt = ''; f.loading = 'lazy';
                b.appendChild(f);
                b.addEventListener('click', function () { ir(i); });
                g.appendChild(b);
            });
            g.classList.remove('hidden');
            g.style.display = 'flex';
            g.setAttribute('data-vsg', '1');
        }

        var raf = 0;
        track.addEventListener('scroll', function () {
            if (raf) return;
            raf = requestAnimationFrame(function () {
                raf = 0;
                var w = track.clientWidth || 1;
                var i = Math.round(track.scrollLeft / w);
                if (i !== estado.idx && i >= 0 && i < estado.imgs.length) marcar(i);
            });
        }, { passive: true });
        marcar(0);
    }

    var abrir0 = window.abrirDetalle;
    if (typeof abrir0 === 'function') {
        window.abrirDetalle = function (nombre, textoImagen) {
            limpiar();
            var r = abrir0.apply(this, arguments);
            try { montar(textoImagen); } catch (e) { console.error('[VSG] galería', e); }
            setTimeout(pintarColores, 0);
            return r;
        };
    }

    document.addEventListener('keydown', function (e) {
        var modal = $('detalleModal');
        if (!estado.imgs.length || !modal || modal.classList.contains('hidden')) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); ir(estado.idx + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); ir(estado.idx - 1); }
    });

    console.log('[VSG] galería y tonos de color activos');
})();
</script>
<!-- vs-galeria:fin -->
`;

/* ====================================================================
   CAMBIOS AL ADMIN (bloque vs-imagen)
   Cada cambio: buscar (string o RegExp) -> reemplazo. Todo o nada.
   ==================================================================== */
const ENTRADA_VERSION =
    "{\n" +
    "                numero: '6.8.0', fecha: '2026-11-07', tipo: 'Novedad',\n" +
    "                titulo: 'Varias fotos por prenda',\n" +
    "                cambios: [\n" +
    "                    'Inventario: el campo Imagen acepta varias fotos, una por línea o separadas por espacio.',\n" +
    "                    'La vista previa muestra todas las fotos y avisa cuál no carga.',\n" +
    "                    'En el catálogo la prenda se abre con carrusel de fotos y los colores muestran su tono.'\n" +
    "                ]\n" +
    "            },\n            ";

const NUEVA_PREVIA = String.raw`function actualizarPrev() {
            var lista = window.VSIMG.partir(campo.value);
            var strip = $('invImgStrip');
            var tok = (actualizarPrev.t = (actualizarPrev.t || 0) + 1);
            if (strip) strip.innerHTML = '';
            if (!lista.length) { prev.classList.remove('on'); return; }
            prev.classList.add('on');
            txt.textContent = 'Cargando ' + lista.length + (lista.length === 1 ? ' foto...' : ' fotos...');
            var ok = 0, mal = 0;
            function fin() {
                if (tok !== actualizarPrev.t || ok + mal < lista.length) return;
                txt.textContent = mal
                    ? (ok + ' cargan, ' + mal + ' no cargan: revisa que sean enlaces directos')
                    : (lista.length === 1 ? 'La foto carga bien' : 'Las ' + lista.length + ' fotos cargan bien (la primera es la principal)');
            }
            lista.forEach(function (u, i) {
                var im = document.createElement('img');
                im.alt = 'Foto ' + (i + 1);
                im.referrerPolicy = 'no-referrer';
                im.onload = function () { ok++; fin(); };
                im.onerror = function () { mal++; im.style.opacity = '.35'; im.style.outline = '2px solid #BE123C'; fin(); };
                im.src = u;
                if (strip) strip.appendChild(im);
            });
        }`;

const CAMBIOS_ADMIN = [
    {
        nombre: 'versión (opcional)', opcional: true,
        buscar: /const HISTORIAL_VERSIONES = \[\s*/,
        reemplazo: (m) => m + ENTRADA_VERSION
    },
    {
        nombre: 'ayudas para partir URLs',
        buscar: 'window.VSIMG = {};',
        reemplazo: () => String.raw`window.VSIMG = {}; /*vsimg-multi*/
    window.VSIMG.partir = function (t) {
        return String(t == null ? '' : t).split(/[\s,;|]+/).filter(Boolean);
    };`
    },
    {
        nombre: 'estilos',
        buscar: "'.vsimg-prev span{font-size:11px;color:var(--tenue)}' +",
        reemplazo: () => "'.vsimg-prev span{font-size:11px;color:var(--tenue)}' +\n" +
            "            '.vsimg-prev{flex-direction:column;align-items:flex-start}' +\n" +
            "            '#invImagen{min-height:84px;resize:vertical;line-height:1.45;font-size:12px;white-space:pre;overflow:auto}' +"
    },
    {
        nombre: 'campo de texto',
        buscar: '<input type="url" id="invImagen" class="campo" placeholder="https://i.ibb.co/xxxx/foto.jpg" autocomplete="off">',
        reemplazo: () => '<textarea id="invImagen" class="campo" rows="3" spellcheck="false" autocomplete="off" placeholder="Una URL por línea (o separadas por espacio)&#10;https://i.postimg.cc/xxxx/foto1.jpg&#10;https://i.postimg.cc/yyyy/foto2.jpg"></textarea>'
    },
    {
        nombre: 'texto de ayuda',
        buscar: 'Pega el enlace directo de la foto (termina en .jpg, .png o .webp).',
        reemplazo: () => 'Puedes pegar VARIAS fotos: una por línea o separadas por espacio. La primera es la principal.'
    },
    {
        nombre: 'zona de vista previa',
        buscar: '<img id="invImgTag" alt="Vista previa">',
        reemplazo: () => '<div id="invImgStrip" style="display:flex;flex-wrap:wrap;gap:6px"></div>'
    },
    {
        nombre: 'vista previa múltiple',
        buscar: /function actualizarPrev\(\) \{[\s\S]*?tag\.src = v;\s*\}/,
        reemplazo: () => NUEVA_PREVIA
    },
    {
        nombre: 'cargar fotos al editar',
        buscar: 'campo.value = imagenDe(p);',
        reemplazo: () => String.raw`campo.value = window.VSIMG.partir(imagenDe(p)).join('\n');`
    },
    {
        nombre: 'validación',
        buscar: String.raw`if (v && !/^https:\/\/\S+$/i.test(v)) {`,
        reemplazo: () => String.raw`if (v && !window.VSIMG.partir(v).every(function (u) { return /^https:\/\/\S+$/i.test(u); })) {`
    },
    {
        nombre: 'mensaje de error',
        buscar: 'La imagen debe ser un enlace que empiece por https://',
        reemplazo: () => 'Cada imagen debe ser un enlace que empiece por https://'
    },
    {
        nombre: 'guardar varias fotos',
        buscar: 'c.producto[COLUMNA] = campo.value.trim();',
        reemplazo: () => "c.producto[COLUMNA] = window.VSIMG.partir(campo.value).join(' ');"
    },
    {
        nombre: 'miniatura de la lista',
        buscar: 'var url = imagenDe(buscar(cod, nEl.textContent));',
        reemplazo: () => "var url = window.VSIMG.partir(imagenDe(buscar(cod, nEl.textContent)))[0] || '';"
    }
];

/* ====================================================================
   EJECUCIÓN
   ==================================================================== */
function main() {
    console.log('Carpeta: ' + raiz + '\n');
    const archivos = recorrer(raiz, []);

    if (REVERTIR) {
        let n = 0;
        archivos.forEach((p) => {
            if (fs.existsSync(p + BAK)) { fs.copyFileSync(p + BAK, p); fs.unlinkSync(p + BAK); console.log('Restaurado: ' + path.relative(raiz, p)); n++; }
        });
        console.log(n ? '\nListo, todo volvió a como estaba.' : 'No encontré copias .bak-vsgal para restaurar.');
        return;
    }

    const admin = [], catalogo = [], comun = [];
    archivos.forEach((p) => {
        let t;
        try { t = leer(p).txt; } catch (e) { return; }
        if (path.basename(p) === 'tienda-comun.js') comun.push(p);
        else if (t.includes('id="detalleGaleria"') && t.includes('id="gridProductos"')) catalogo.push(p);
        else if (t.includes('vs-imagen:inicio')) admin.push(p);
    });

    let hechos = 0, fallos = 0;

    catalogo.forEach((p) => {
        const { txt, crlf } = leer(p);
        const rel = path.relative(raiz, p);
        if (txt.includes('vs-galeria:inicio')) { console.log('= Catálogo ya parchado: ' + rel); return; }
        const i = txt.lastIndexOf('</body>');
        if (i === -1) { console.log('X Catálogo sin </body>: ' + rel); fallos++; return; }
        escribir(p, txt.slice(0, i) + BLOQUE_CATALOGO.replace(/^\n/, '') + '\n' + txt.slice(i), crlf);
        console.log('OK Catálogo: ' + rel); hechos++;
    });

    admin.forEach((p) => {
        let { txt, crlf } = leer(p);
        const rel = path.relative(raiz, p);
        if (txt.includes('vsimg-multi')) { console.log('= Admin ya parchado: ' + rel); return; }
        let nuevo = txt, error = null;
        for (const c of CAMBIOS_ADMIN) {
            const existe = typeof c.buscar === 'string' ? nuevo.includes(c.buscar) : c.buscar.test(nuevo);
            if (!existe) {
                if (c.opcional) { console.log('  (omitido, opcional: ' + c.nombre + ')'); continue; }
                error = c.nombre; break;
            }
            nuevo = typeof c.buscar === 'string' ? nuevo.replace(c.buscar, c.reemplazo) : nuevo.replace(c.buscar, c.reemplazo);
        }
        if (error) {
            console.log('X Admin NO se tocó (' + rel + '): no encontré la parte "' + error + '". El archivo cambió respecto a la versión esperada.');
            fallos++; return;
        }
        escribir(p, nuevo, crlf);
        console.log('OK Admin: ' + rel); hechos++;
    });

    comun.forEach((p) => {
        const { txt, crlf } = leer(p);
        const rel = path.relative(raiz, p);
        if (txt.includes('vsg-lista:inicio')) { console.log('= tienda-comun.js ya parchado: ' + rel); return; }
        escribir(p, txt.replace(/\s*$/, '\n') + BLOQUE_COMUN, crlf);
        console.log('OK tienda-comun.js: ' + rel); hechos++;
    });

    console.log('');
    if (!catalogo.length) console.log('! No encontré el catálogo (busco un .html con id="detalleGaleria" y id="gridProductos").');
    if (!admin.length) console.log('! No encontré el admin (busco un .html con el bloque vs-imagen). Si tu admin es más viejo, avísame.');
    if (!comun.length) console.log('! No encontré tienda-comun.js (no es obligatorio: el catálogo ya trae su propio lector de varias fotos).');
    console.log(hechos + ' archivo(s) parchado(s)' + (fallos ? ', ' + fallos + ' con problemas.' : '.'));
    if (hechos) console.log('Ahora sube/despliega los cambios y recarga con Ctrl+F5.\nPara deshacer: node parche-galeria.js --revertir');
    if (fallos) process.exitCode = 1;
}

main();
