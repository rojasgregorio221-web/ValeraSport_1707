#!/usr/bin/env node
/*
 * PARCHE FONDO SÓLIDO · Valera Sport
 *
 * Uso (desde la carpeta de tu proyecto, o pasando la ruta):
 *   node parche-fondo-solido.js
 *   node parche-fondo-solido.js ./public
 *   node parche-fondo-solido.js --revertir        (restaura las copias .bak-vsfondo)
 *
 * Qué hace:
 *  CATÁLOGO: en vez del fondo difuminado con el color de la prenda (el amarillo),
 *  el cuadro de la foto toma el color real del fondo de cada foto (el gris claro
 *  de atrás de la camisa). Lo calcula leyendo los bordes de cada imagen, y se
 *  actualiza solo al pasar de una foto a otra. Aplica en la ficha y en las tarjetas.
 *
 * No necesita instalar nada. Crea copia de seguridad (.bak-vsfondo) la primera vez.
 * Se puede ejecutar varias veces sin duplicar nada.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const REVERTIR = args.includes('--revertir');
const raiz = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd());
const BAK = '.bak-vsfondo';
const IGNORAR = new Set(['node_modules', '.git', '.vercel', '.next', '.cache']);

function recorrer(dir, salida) {
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return salida; }
    for (const e of ents) {
        if (IGNORAR.has(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) recorrer(p, salida);
        else if (/\.html?$/i.test(e.name)) salida.push(p);
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
   BLOQUE QUE SE AGREGA AL CATÁLOGO (antes de </body>)
   ==================================================================== */
const BLOQUE_CATALOGO = String.raw`
<!-- vs-fondo-solido:inicio -->
<style>
.vs-solido{background-color:var(--vs-bg)!important;transition:background-color .3s ease}
.vs-solido::before{display:none!important}
</style>
<script>
(function () {
    var cache = {};

    function colorBorde(src, cb) {
        if (cache[src] !== undefined) return cb(cache[src]);
        var im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload = function () {
            try {
                var w = 60, h = Math.max(1, Math.round(w * im.naturalHeight / (im.naturalWidth || 1)));
                var c = document.createElement('canvas'); c.width = w; c.height = h;
                var x = c.getContext('2d', { willReadFrequently: true });
                x.drawImage(im, 0, 0, w, h);
                var d = x.getImageData(0, 0, w, h).data, R = [], G = [], B = [];
                for (var py = 0; py < h; py++) for (var px = 0; px < w; px++) {
                    if (px > 2 && px < w - 3 && py > 2 && py < h - 3) continue; // solo el borde
                    var i = (py * w + px) * 4;
                    if (d[i + 3] < 200) continue;
                    R.push(d[i]); G.push(d[i + 1]); B.push(d[i + 2]);
                }
                var med = function (a) { a.sort(function (p, q) { return p - q; }); return a[a.length >> 1]; };
                cache[src] = R.length > 10 ? 'rgb(' + med(R) + ',' + med(G) + ',' + med(B) + ')' : null;
            } catch (e) { cache[src] = null; } // sin permiso CORS: queda el fondo difuminado
            cb(cache[src]);
        };
        im.onerror = function () { cache[src] = null; cb(null); };
        im.src = src;
    }

    function aplicar(marco, img) {
        if (!marco || !img) return;
        var src = img.currentSrc || img.getAttribute('src') || '';
        if (!src || /logo\.jpg/i.test(src)) { marco.classList.remove('vs-solido'); return; }
        colorBorde(src, function (c) {
            if ((img.currentSrc || img.getAttribute('src')) !== src) return; // ya cambió de foto
            if (c) { marco.style.setProperty('--vs-bg', c); marco.classList.add('vs-solido'); }
            else marco.classList.remove('vs-solido');
        });
    }

    function iniciar() {
        // Ficha de la prenda (y cada vez que cambias de foto)
        var img = document.getElementById('detalleImagen');
        if (img) {
            var marco = img.closest('.vs-foto-marco');
            var act = function () { aplicar(marco, img); };
            new MutationObserver(act).observe(img, { attributes: true, attributeFilter: ['src'] });
            img.addEventListener('load', act);
            act();
        }
        // Tarjetas del catálogo
        var grid = document.getElementById('gridProductos');
        function tarjetas() {
            document.querySelectorAll('#gridProductos .marco').forEach(function (m) {
                if (m.dataset.vsSolido === '1') return;
                m.dataset.vsSolido = '1';
                var im = m.querySelector('img');
                if (!im) return;
                aplicar(m, im);
                im.addEventListener('load', function () { aplicar(m, im); });
            });
        }
        if (grid) { new MutationObserver(tarjetas).observe(grid, { childList: true }); tarjetas(); }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
</script>
<!-- vs-fondo-solido:fin -->
`;

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
        console.log(n ? '\nListo, todo volvió a como estaba.' : 'No encontré copias .bak-vsfondo para restaurar.');
        return;
    }

    const catalogo = [];
    archivos.forEach((p) => {
        let t;
        try { t = leer(p).txt; } catch (e) { return; }
        if (t.includes('id="detalleGaleria"') && t.includes('id="gridProductos"')) catalogo.push(p);
    });

    let hechos = 0, fallos = 0;

    catalogo.forEach((p) => {
        const { txt, crlf } = leer(p);
        const rel = path.relative(raiz, p);
        if (txt.includes('vs-fondo-solido:inicio')) { console.log('= Catálogo ya parchado: ' + rel); return; }
        const i = txt.lastIndexOf('</body>');
        if (i === -1) { console.log('X Catálogo sin </body>: ' + rel); fallos++; return; }
        escribir(p, txt.slice(0, i) + BLOQUE_CATALOGO.replace(/^\n/, '') + '\n' + txt.slice(i), crlf);
        console.log('OK Catálogo: ' + rel); hechos++;
    });

    console.log('');
    if (!catalogo.length) console.log('! No encontré el catálogo (busco un .html con id="detalleGaleria" y id="gridProductos").');
    console.log(hechos + ' archivo(s) parchado(s)' + (fallos ? ', ' + fallos + ' con problemas.' : '.'));
    if (hechos) console.log('Ahora sube/despliega los cambios y recarga con Ctrl+F5.\nPara deshacer: node parche-fondo-solido.js --revertir');
    if (fallos) process.exitCode = 1;
}

main();
