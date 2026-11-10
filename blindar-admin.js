js_code = r"""/**
 * Script de Blindaje de Seguridad para admin.html — Valera Sport
 * Ejecución en VS Code: node blindar-admin.js
 */

const fs = require('fs');
const path = require('path');

const ARCHIVO_OBJETIVO = path.join(__dirname, 'admin.html');
const ARCHIVO_RESPALDO = path.join(__dirname, 'admin.backup.html');

if (!fs.existsSync(ARCHIVO_OBJETIVO)) {
    console.error('❌ No se encontró "admin.html" en esta carpeta:', __dirname);
    process.exit(1);
}

// 1. Crear copia de respaldo antes de tocar el archivo original
const htmlOriginal = fs.readFileSync(ARCHIVO_OBJETIVO, 'utf8');
fs.writeFileSync(ARCHIVO_RESPALDO, htmlOriginal, 'utf8');
console.log('📦 Respaldo creado exitosamente en: admin.backup.html');

let html = htmlOriginal;
let cambiosAplicados = 0;

// ============================================================================
// PARCHE 1: Endurecer Content-Security-Policy (CSP)
// - Cierra connect-src a 'self' (evita robo de datos a servidores externos)
// - Elimina CDNs innecesarios (unpkg, code.jquery.com)
// - Agrega object-src 'none' y base-uri 'self'
// ============================================================================
const cspRegex = /<meta\s+http-equiv="Content-Security-Policy"[^>]*>/i;
const nuevoCSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self';">`;

if (cspRegex.test(html)) {
    html = html.replace(cspRegex, nuevoCSP);
    cambiosAplicados++;
    console.log('✅ [1/5] Política Content-Security-Policy (CSP) blindada.');
} else {
    console.warn('⚠️ [1/5] No se encontró la etiqueta CSP original, insertándola en <head>...');
    html = html.replace('<head>', '<head>\n' + nuevoCSP);
    cambiosAplicados++;
}

// ============================================================================
// PARCHE 2: Migrar caché sensible de localStorage a sessionStorage
// - Evita que los pedidos, teléfonos y ventas queden guardados en el dispositivo
//   después de cerrar la pestaña.
// ============================================================================
const cacheViejo = `localStorage.getItem(LLAVE_CACHE)`;
if (html.includes(cacheViejo)) {
    html = html.replace(/localStorage\.getItem\(LLAVE_CACHE\)/g, 'sessionStorage.getItem(LLAVE_CACHE)');
    html = html.replace(/localStorage\.setItem\(LLAVE_CACHE,\s*JSON\.stringify\(combinado\)\)/g, 'sessionStorage.setItem(LLAVE_CACHE, JSON.stringify(combinado))');
    cambiosAplicados++;
    console.log('✅ [2/5] Caché de pedidos y ventas migrada de localStorage a sessionStorage.');
}

// ============================================================================
// PARCHE 3: Limpieza total de memoria y caché en cerrarSesion()
// - Borra sessionStorage, localStorage residual y vacía los arreglos en RAM.
// ============================================================================
const cerrarSesionRegex = /function\s+cerrarSesion\s*\(\)\s*\{[\s\S]*?inputPassword\.value\s*=\s*'';\s*\}/;
const nuevoCerrarSesion = `function cerrarSesion() {
            sessionStorage.removeItem(PASSWORD_KEY);
            sessionStorage.removeItem(LLAVE_CACHE);
            try { localStorage.removeItem(LLAVE_CACHE); } catch (e) {}
            listaVentasMemoria = [];
            listaFiadosMemoria = [];
            listaGastosMemoria = [];
            carritoFisica = [];
            try { mostrarPantallaAccion(null); } catch (e) {}
            panelPrincipal.classList.add('hidden');
            pantallaLogin.classList.remove('hidden');
            inputPassword.value = '';
        }`;

if (cerrarSesionRegex.test(html)) {
    html = html.replace(cerrarSesionRegex, nuevoCerrarSesion);
    cambiosAplicados++;
    console.log('✅ [3/5] Función cerrarSesion() reforzada con purga de RAM y almacenamiento.');
}

// ============================================================================
// PARCHE 4: Eliminar document.write() vulnerable a XSS en imprimirQR()
// - Reemplaza la concatenación de HTML + <script> por creación segura de nodos DOM.
// ============================================================================
const imprimirQRRegex = /function\s+imprimirQR\s*\(\)\s*\{[\s\S]*?ventana\.document\.close\(\);\s*\}/;
const nuevoImprimirQR = `function imprimirQR() {
            const contenedor = document.getElementById('canvasQR');
            const canvas = contenedor ? contenedor.querySelector('canvas') : null;
            const imgSrc = canvas ? canvas.toDataURL('image/png') : ((contenedor && contenedor.querySelector('img')) || {}).src;
            if (!imgSrc || !String(imgSrc).startsWith('data:image/')) {
                alert('No se pudo preparar el QR para imprimir.');
                return;
            }

            const etiqueta = document.getElementById('qrCodigo').value.trim();
            const ventana = window.open('', '_blank', 'noopener,noreferrer');
            if (!ventana) {
                alert('El navegador bloqueó la ventana. Permite las ventanas emergentes.');
                return;
            }

            const doc = ventana.document;
            doc.title = 'Imprimir QR';
            doc.body.style.cssText = 'text-align:center; font-family:Arial, sans-serif; padding-top:40px;';

            const img = doc.createElement('img');
            img.src = imgSrc;
            img.style.width = '220px';

            const p = doc.createElement('p');
            p.style.cssText = 'font-weight:bold; font-size:16px;';
            p.textContent = etiqueta;

            doc.body.appendChild(img);
            doc.body.appendChild(p);
            img.onload = function () { ventana.print(); };
        }`;

if (imprimirQRRegex.test(html)) {
    html = html.replace(imprimirQRRegex, nuevoImprimirQR);
    cambiosAplicados++;
    console.log('✅ [4/5] Función imprimirQR() blindada contra DOM XSS (sin document.write).');
}

// ============================================================================
// PARCHE 5: Auto-cierre de sesión por inactividad (15 minutos) + freno de intervalos
// - Si dejan el teléfono o la PC abierta en la tienda sin tocarla por 15 min,
//   cierra la sesión sola y limpia los datos en pantalla.
// ============================================================================
const marcadorInactividad = '/* [VS-SECURITY-AUTO-LOCK] */';
const bloqueInactividad = `
        ${marcadorInactividad}
        (function configurarCierreInactividad() {
            const TIEMPO_MAX_INACTIVIDAD = 15 * 60 * 1000; // 15 minutos
            let timerInactividad = null;

            function reiniciarRelojInactividad() {
                if (timerInactividad) clearTimeout(timerInactividad);
                if (obtenerPassword() && !panelPrincipal.classList.contains('hidden')) {
                    timerInactividad = setTimeout(() => {
                        cerrarSesion();
                        if (errorLogin) {
                            errorLogin.textContent = 'Sesión cerrada por inactividad para proteger la caja.';
                            errorLogin.className = 'msg msg-warn';
                            errorLogin.classList.remove('hidden');
                        }
                    }, TIEMPO_MAX_INACTIVIDAD);
                }
            }

            ['click', 'keydown', 'touchstart', 'scroll'].forEach((evento) => {
                document.addEventListener(evento, reiniciarRelojInactividad, { passive: true });
            });
            reiniciarRelojInactividad();
        })();
`;

if (!html.includes(marcadorInactividad)) {
    const cierreScriptPrincipal = `setInterval(() => {\n            if (!panelPrincipal.classList.contains('hidden')) cargarTodo();\n        }, INTERVALO_REFRESCO);`;
    if (html.includes('INTERVALO_REFRESCO);')) {
        html = html.replace('INTERVALO_REFRESCO);', 'INTERVALO_REFRESCO);\n' + bloqueInactividad);
        cambiosAplicados++;
        console.log('✅ [5/5] Bloqueo automático por inactividad (15 min) inyectado.');
    }
}

// Guardar archivo actualizado
fs.writeFileSync(ARCHIVO_OBJETIVO, html, 'utf8');
console.log(`\n🎉 Blindaje completado (${cambiosAplicados} parches aplicados sobre admin.html).`);
"""

with open("blindar-admin.js", "w", encoding="utf-8") as f:
    f.write(js_code)

print("Archivo generado correctamente")