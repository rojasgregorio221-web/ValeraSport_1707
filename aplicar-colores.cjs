#!/usr/bin/env node
/**
 * aplicar-colores.js
 * Pasa las páginas de la tienda de la paleta morado/naranja/fucsia a la paleta azul del panel.
 *
 * Uso (desde la terminal de VS Code, en la carpeta del proyecto):
 *     node aplicar-colores.js                      -> index.html, catalogo, carrito y pedido
 *     node aplicar-colores.js carrito.html         -> solo ese archivo
 *     node aplicar-colores.js a.html b.html        -> varios
 *
 * - Hace un respaldo por archivo: nombre.html.bak (solo la primera vez, nunca lo pisa).
 * - Se puede correr varias veces sin dañar nada.
 * - Se niega a tocar archivos del panel/admin.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const lista = args.length ? args : ['index.html', 'catalogo.html', 'carrito.html', 'pedido.html'];

// ---------- Colores hexadecimales (viejo -> nuevo, paleta del panel) ----------
const HEX = [
    ['#FF5A1F', '#0284C7'],   // brasa (naranja)    -> azul profundo
    ['#FF2D87', '#00A8E8'],   // fucsia             -> azul cian del panel
    ['#7C4DFF', '#38BDF8'],   // violeta            -> azul claro
    ['#22D3EE', '#38BDF8'],   // cyan               -> azul claro
    ['#140F2E', '#0F172A'],   // noche (morado)     -> azul noche del panel
    ['#16131F', '#0F172A'],   // tinta              -> texto del panel
    ['#F6F3EC', '#F4F8FC'],   // hueso (crema)      -> fondo claro del panel
    ['#ECE7DC', '#E3EEF7'],   // fondos de tarjeta
    ['#E9E6DF', '#E6EEF5'],   // fondo de fotos (catálogo)
    ['#A5F3FC', '#BAE6FD'],   // texto celeste del aviso de descuento (carrito)
    ['#FDBA74', '#7DD3FC'],   // texto naranja de la etiqueta "En revisión" (pedido)
    ['#CFC9BD', '#C3D3E3'],   // scrollbar
    ['#9A948A', '#7C8DA3'],   // gris suave
    ['#6B665D', '#475569']    // gris de texto
];

// ---------- rgba(R,G,B,a): se cambia solo el color y se conserva la transparencia ----------
const RGB = [
    [[255, 90, 31],   [2, 132, 199]],
    [[255, 45, 135],  [0, 168, 232]],
    [[124, 77, 255],  [56, 189, 248]],
    [[34, 211, 238],  [56, 189, 248]],
    [[20, 15, 46],    [15, 23, 42]],
    [[22, 19, 31],    [15, 23, 42]],
    [[246, 243, 236], [244, 248, 252]]
];

// Tonos de las muestras de color de los productos (ej. "aqua: '#22D3EE'"): NO son del tema, no se tocan.
const PROTEGIDO = /(\baqua\s*:\s*['"])#22D3EE/gi;

function procesar(ruta) {
    const archivo = path.resolve(ruta);
    const nombre = path.basename(archivo);
    if (/admin|panel/i.test(nombre)) {
        console.log('- ' + nombre + ': es del panel, no lo toco.');
        return;
    }
    if (!fs.existsSync(archivo)) {
        console.log('- ' + nombre + ': no lo encontré en ' + path.dirname(archivo) + ' (lo salto).');
        return;
    }

    let html = fs.readFileSync(archivo, 'utf8');
    const original = html;
    const cuenta = {};
    function reemplazar(etiqueta, regex, nuevo) {
        let n = 0;
        html = html.replace(regex, () => { n++; return nuevo; });
        if (n) cuenta[etiqueta] = (cuenta[etiqueta] || 0) + n;
    }

    html = html.replace(PROTEGIDO, '$1@@AQUA@@');

    HEX.forEach(([viejo, nuevo]) => reemplazar(viejo + ' -> ' + nuevo, new RegExp(viejo, 'gi'), nuevo));
    RGB.forEach(([[r, g, b], [r2, g2, b2]]) => {
        const re = new RegExp('rgba\\(\\s*' + r + '\\s*,\\s*' + g + '\\s*,\\s*' + b + '\\s*,', 'gi');
        reemplazar('rgba(' + r + ',' + g + ',' + b + ') -> rgba(' + r2 + ',' + g2 + ',' + b2 + ')', re, 'rgba(' + r2 + ', ' + g2 + ', ' + b2 + ',');
    });

    html = html.replace(/@@AQUA@@/g, '#22D3EE');

    if (html === original) {
        console.log('- ' + nombre + ': ya tiene la paleta azul (nada que cambiar).');
        return;
    }
    const respaldo = archivo + '.bak';
    if (!fs.existsSync(respaldo)) fs.writeFileSync(respaldo, original, 'utf8');
    fs.writeFileSync(archivo, html, 'utf8');

    console.log('✓ ' + nombre + ' ahora usa los colores del panel (respaldo: ' + path.basename(respaldo) + ')');
    Object.keys(cuenta).forEach(k => console.log('    ' + String(cuenta[k]).padStart(3) + '  ' + k));
}

lista.forEach(procesar);
console.log('\nPara deshacer un archivo: copia su .bak encima del original.');