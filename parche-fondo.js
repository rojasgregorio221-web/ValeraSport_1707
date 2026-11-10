// Uso (en la terminal de VS Code, dentro de la carpeta del sitio):
//   node parche-fondo.js
//   node parche-fondo.js ruta/a/catalogo.html   (si el archivo está en otro lado)
//
// Qué hace: la foto de la prenda se queda completa (sin estirarla ni recortarla)
// y detrás se pone la MISMA foto, estirada y difuminada, cubriendo todo el cuadro.
// Así el fondo de la foto se "extiende" y ya no se ve blanco alrededor.
// Hace copia de seguridad (.bak) y se puede ejecutar varias veces sin duplicar.

const fs = require('fs');
const path = require('path');

const archivo = path.resolve(process.argv[2] || 'catalogo.html');
if (!fs.existsSync(archivo)) {
  console.error('No encuentro el archivo: ' + archivo);
  console.error('Ejecútalo desde la carpeta donde está catalogo.html o pásale la ruta.');
  process.exit(1);
}

let html = fs.readFileSync(archivo, 'utf8');

const MARCA_CSS = '/* PARCHE-FONDO-FOTO */';
const MARCA_JS = '<!-- PARCHE-FONDO-FOTO-JS -->';

if (html.includes(MARCA_CSS)) {
  console.log('El parche ya estaba aplicado. No se cambió nada.');
  process.exit(0);
}

const css = `
        ${MARCA_CSS}
        /* Capa de fondo: la misma foto, estirada a todo el cuadro y difuminada */
        .vs-foto-marco, .marco { background-color: #e9e6df; }
        .vs-foto-marco::before, .marco::before {
            content: ""; position: absolute; inset: -40px; z-index: 0;
            background-image: var(--fondo, none);
            background-size: cover; background-position: center;
            filter: blur(26px) saturate(1.05);
            transform: scale(1.15);
            pointer-events: none;
        }
        .vs-foto-img, .marco img { position: relative; z-index: 1; }
        .vs-foto-img { background: transparent; }
        /* Tarjetas: la foto ocupa todo el cuadro, sin el margen blanco */
        .marco { background-color: #e9e6df; }
        .marco img { padding: 0; }
        /* Sin foto (logo) o agotado */
        .marco.sin-foto::before { display: none; }
        .marco.agotado::before { filter: blur(26px) grayscale(0.7); opacity: 0.6; }
`;

const js = `
    ${MARCA_JS}
    <script>
    (function () {
        function poner(marco, img) {
            if (!marco || !img) return;
            var src = img.currentSrc || img.getAttribute('src') || '';
            if (!src || /logo\\.jpg/i.test(src)) {
                marco.style.removeProperty('--fondo');
                return;
            }
            marco.style.setProperty('--fondo', 'url("' + src.replace(/"/g, '%22') + '")');
        }

        // Detalle del producto (también cuando se cambia de foto en la galería)
        function vigilarDetalle() {
            var img = document.getElementById('detalleImagen');
            if (!img) return;
            var marco = img.closest('.vs-foto-marco');
            var actualizar = function () { poner(marco, img); };
            new MutationObserver(actualizar).observe(img, { attributes: true, attributeFilter: ['src'] });
            img.addEventListener('load', actualizar);
            actualizar();
        }

        // Tarjetas del catálogo (se vuelven a crear con cada filtro)
        function procesarTarjetas() {
            document.querySelectorAll('#gridProductos .marco').forEach(function (marco) {
                var img = marco.querySelector('img');
                if (!img || marco.dataset.fondo === '1') return;
                marco.dataset.fondo = '1';
                poner(marco, img);
                img.addEventListener('load', function () { poner(marco, img); });
                // Si la foto falla y cae al logo, la clase sin-foto oculta el fondo
            });
        }

        function iniciar() {
            vigilarDetalle();
            var grid = document.getElementById('gridProductos');
            if (grid) {
                new MutationObserver(procesarTarjetas).observe(grid, { childList: true });
                procesarTarjetas();
            }
        }

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
        else iniciar();
    })();
    </script>
`;

if (!html.includes('</style>') || !html.includes('</body>')) {
  console.error('El archivo no tiene </style> o </body>; no es el catalogo.html esperado.');
  process.exit(1);
}

fs.copyFileSync(archivo, archivo + '.bak');

// CSS: antes del cierre del último <style>
const iStyle = html.lastIndexOf('</style>');
html = html.slice(0, iStyle) + css + '    ' + html.slice(iStyle);

// JS: antes de </body>
const iBody = html.lastIndexOf('</body>');
html = html.slice(0, iBody) + js + html.slice(iBody);

fs.writeFileSync(archivo, html, 'utf8');
console.log('Listo. Parche aplicado a: ' + archivo);
console.log('Copia de seguridad: ' + archivo + '.bak');
console.log('Recarga la página con Ctrl+F5.');
