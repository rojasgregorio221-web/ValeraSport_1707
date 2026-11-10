/* Presentacion/modulos/venta-simple.js · generado por separar-capas.js · el código está igual que en admin.html */
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    if (window.VSV) return;

    var sec = $('formularioFisica');
    var sel = $('fisicaMetodoPago');
    var cuerpo = sec ? sec.querySelector('.pantalla-cuerpo') : null;
    if (!sec || !sel || !cuerpo) { console.warn('[VSV] No encontré la pantalla de venta; no se activó.'); return; }
    window.VSV = {};

    /* ---------- Nodos que ya existen y que solo se reordenan ---------- */
    var scan = cuerpo.querySelector('button[onclick*="abrirScannerVenta"]');
    var typed = cuerpo.querySelector('details');
    var carrito = $('carritoFisicaContenedor');
    var selWrap = sel.parentElement;
    var grid = selWrap ? selWrap.parentElement : null;
    var correoWrap = $('fisicaCorreo') ? $('fisicaCorreo').parentElement : null;
    var notaWrap = $('fisicaNota') ? $('fisicaNota').parentElement : null;
    var cp = $('cpBloque');
    var vv = $('bloqueVuelto');
    var fiado = $('camposFiadoFisica');
    var btn = $('btnRegistrarVentaFisica');
    var msg = $('mensajeFisica');

    /* ---------- Mensaje de ayuda cuando todavía no hay prendas ---------- */
    var hint = document.createElement('p');
    hint.className = 'vsv-hint';
    hint.innerHTML = '<i class="fa-solid fa-shirt" style="margin-right:6px"></i> Escanea una prenda o escríbela para empezar.';

    /* ---------- ¿Cómo paga? ---------- */
    var GRUPOS = [
        ['Bolívares', 'c4', [
            ['Pago Móvil', 'Pago Móvil', 'fa-mobile-screen-button'],
            ['Punto de venta', 'Punto', 'fa-credit-card'],
            ['Transferencia', 'Transferencia', 'fa-building-columns'],
            ['Efectivo Bs', 'Efectivo Bs', 'fa-money-bill-wave']
        ]],
        ['Dólares', 'c3', [
            ['Efectivo USD', 'Efectivo $', 'fa-dollar-sign'],
            ['Zelle', 'Zelle', 'fa-bolt'],
            ['Binance', 'Binance', 'fa-coins']
        ]],
        ['Otras formas', 'c2', [
            ['Cashea', 'Cashea (cuotas)', 'fa-calendar-check'],
            ['Fiado', 'Fiado (debe)', 'fa-hand-holding-dollar']
        ]]
    ];
    var chips = [];
    var pago = document.createElement('div');
    pago.id = 'vsvPago';
    pago.className = 'vsv-pago';
    var tit = document.createElement('p');
    tit.className = 'vsv-tit';
    tit.textContent = '¿Cómo paga?';
    pago.appendChild(tit);

    GRUPOS.forEach(function (g) {
        var caja = document.createElement('div');
        caja.className = 'vsv-grupo';
        var gl = document.createElement('p');
        gl.className = 'vsv-gl';
        gl.textContent = g[0];
        var fila = document.createElement('div');
        fila.className = 'vsv-fila ' + g[1];
        g[2].forEach(function (o) {
            var existe = Array.prototype.some.call(sel.options, function (op) { return op.value === o[0]; });
            if (!existe) return;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'vsv-chip';
            b.setAttribute('data-v', o[0]);
            b.innerHTML = '<i class="fa-solid ' + o[2] + '"></i><span>' + o[1] + '</span>';
            b.addEventListener('click', function () { elegir(o[0]); });
            fila.appendChild(b);
            chips.push(b);
        });
        if (!fila.children.length) return;
        caja.appendChild(gl);
        caja.appendChild(fila);
        pago.appendChild(caja);
    });

    function elegir(v) {
        if (sel.value === v) { sincronizar(); return; }
        sel.value = v;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        // El vuelto no aplica con Cashea ni Fiado: se apaga para que no quede nada escondido activo
        if ((v === 'Cashea' || v === 'Fiado') && typeof window.vvLimpiar === 'function') {
            try { var sw = $('vvActivo'); if (sw && sw.checked) window.vvLimpiar(true); } catch (e) { }
        }
        sincronizar();
    }

    /* ---------- Plan Cashea, versión corta (se conservan todos los id que usa el panel) ---------- */
    var PORCENTAJES = [20, 30, 40, 50, 60];
    var pctBtns = [];
    if (cp) {
        var valorPrevio = $('cpPct') ? $('cpPct').value : '40';
        cp.innerHTML =
            '<div class="vsv-cs-cab"><span><i class="fa-solid fa-calendar-check"></i>Plan Cashea</span><span id="cpCuotasTxt" class="chip chip-mute"></span></div>' +
            '<p class="vsv-sub">Los precios de arriba ya llevan el recargo de Cashea.</p>' +
            '<div><p class="vsv-gl" style="margin-bottom:8px">Inicial que paga hoy</p><div class="vsv-pcts" id="vsvPcts"></div></div>' +
            '<div class="vsv-cs-resumen">' +
                '<div class="vsv-caja fuerte"><span>Cliente paga hoy</span><b id="cpInicial">$0.00</b><small id="cpInicialBs"></small></div>' +
                '<div class="vsv-caja"><span>Cashea financia</span><b id="cpFinanciado">$0.00</b><small id="cpFinanciadoBs"></small></div>' +
            '</div>' +
            '<p id="cpCuotasDetalle"></p>' +
            '<input type="checkbox" id="cpActivo" checked hidden>' +
            '<span id="cpTotal" hidden></span><span id="cpTotalBs" hidden></span>';

        var cont = $('vsvPcts');
        PORCENTAJES.forEach(function (n) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'vsv-pct';
            b.setAttribute('data-p', String(n));
            b.textContent = n + '%';
            b.addEventListener('click', function () {
                $('cpPct').value = String(n);
                if (typeof window.cpRender === 'function') window.cpRender();
                sincronizar();
            });
            cont.appendChild(b);
            pctBtns.push(b);
        });
        var otro = document.createElement('label');
        otro.className = 'vsv-otro';
        otro.innerHTML = 'Otro <input type="number" id="cpPct" min="1" max="100" step="1" value="' + (valorPrevio || '40') + '" class="campo cifra" oninput="cpRender()" aria-label="Otro porcentaje de inicial"> %';
        cont.appendChild(otro);
        if (typeof window.cpRender === 'function') window.cpRender();
    }

    /* ---------- Más datos (opcional) ---------- */
    var mas = document.createElement('details');
    mas.className = 'vsv-mas sub-panel';
    mas.innerHTML = '<summary><span><i class="fa-regular fa-envelope" style="margin-right:8px"></i>Más datos (opcional): correo y nota</span><i class="fa-solid fa-chevron-down"></i></summary><div class="vsv-mas-cuerpo"></div>';
    var masCuerpo = mas.querySelector('.vsv-mas-cuerpo');
    if (correoWrap) masCuerpo.appendChild(correoWrap);
    if (notaWrap) masCuerpo.appendChild(notaWrap);

    /* ---------- Orden final de la pantalla ---------- */
    [scan, typed, hint, carrito, pago, cp, vv, fiado, mas, btn, msg].forEach(function (n) {
        if (n) cuerpo.appendChild(n);
    });
    if (grid) grid.style.display = 'none';   // el selector original queda escondido, pero sigue guardando el valor

    /* ---------- Mantener todo al día ---------- */
    function sincronizar() {
        var m = sel.value;
        var n = 0;
        try { n = carritoFisica.length; } catch (e) { }

        sec.classList.toggle('vsv-vacio', n === 0);
        sec.classList.toggle('vsv-m-cashea', m === 'Cashea');
        sec.classList.toggle('vsv-m-fiado', m === 'Fiado');

        chips.forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-v') === m); });

        var inp = $('cpPct');
        var pv = inp ? parseFloat(String(inp.value).replace(',', '.')) : NaN;
        pctBtns.forEach(function (b) { b.classList.toggle('on', parseFloat(b.getAttribute('data-p')) === pv); });

        // El texto del botón dice cuánto cobrar (sin pisar el "Venta guardada" de después de guardar)
        var t = $('textoRegistrarVentaFisica');
        if (t && /^(Guardar la venta|Cobrar|Anotar fiado|Guardar venta)/.test(t.textContent.trim())) {
            var total = 0;
            try { total = n ? calcularResumenCarritoFisica().total : 0; } catch (e) { }
            var txt = 'Guardar la venta';
            if (n && total > 0) {
                if (m === 'Fiado') txt = 'Anotar fiado · $' + total.toFixed(2);
                else if (m === 'Cashea') txt = 'Guardar venta Cashea · $' + total.toFixed(2);
                else txt = 'Cobrar $' + total.toFixed(2);
            }
            if (t.textContent !== txt) t.textContent = txt;
        }
    }
    window.VSV.sincronizar = sincronizar;

    sel.addEventListener('change', sincronizar);
    setInterval(function () { if (sec.classList.contains('abierta')) sincronizar(); }, 400);
    sincronizar();
    console.log('[VSV] venta simplificada activa');
})();
