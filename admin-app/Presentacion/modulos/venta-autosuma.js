/* Presentacion/modulos/venta-autosuma.js · generado por separar-capas.js · el código está igual que en admin.html */
(function () {
    var $ = function (i) { return document.getElementById(i); };
    var sec = $('formularioFisica');
    var P = $('fisicaProducto'), R = $('fisicaPrecio'), C = $('fisicaCategoria');
    if (!sec || !P || !R) { console.warn('[VSV2] no encontré el formulario'); return; }
    if (window.VSV2) return;
    window.VSV2 = {};

    var typed = sec.querySelector('details.group');
    var timer = null;

    /* ---------- Aviso corto ---------- */
    var toast = document.createElement('div');
    toast.id = 'vsv2Toast';
    document.body.appendChild(toast);
    var tt = null;
    function avisar(txt) {
        toast.textContent = txt;
        toast.classList.add('on');
        clearTimeout(tt);
        tt = setTimeout(function () { toast.classList.remove('on'); }, 1700);
    }

    /* ---------- Nota donde estaba el botón ---------- */
    if (typed) {
        var botonViejo = typed.querySelector('button[onclick="agregarItemCarritoFisica()"]');
        if (botonViejo) {
            var nota = document.createElement('p');
            nota.className = 'vsv2-nota';
            nota.textContent = 'Se suma sola al escribir nombre y precio.';
            botonViejo.parentNode.insertBefore(nota, botonViejo);
        }
    }

    /* ---------- Sumar sola ---------- */
    function precio() { return parseFloat(String(R.value).replace(',', '.')); }
    function valido() { return P.value.trim().length > 0 && precio() > 0; }
    function delCatalogo() {
        try {
            var v = P.value.trim().toLowerCase();
            return productosCatalogo.some(function (x) { return (x.producto || x.nombre || '').toLowerCase().trim() === v; });
        } catch (e) { return false; }
    }
    function sumar() {
        clearTimeout(timer);
        if (!valido()) return false;
        try { agregarItemCarritoFisica(); } catch (e) { console.error(e); return false; }
        avisar('✓ Prenda sumada');
        try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) { }
        setTimeout(function () {
            var d = $('vsvPago');
            if (d && d.scrollIntoView) { try { d.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { d.scrollIntoView(); } }
            if (window.VSV && window.VSV.sincronizar) window.VSV.sincronizar();
        }, 120);
        return true;
    }
    function programar(ms) {
        clearTimeout(timer);
        if (valido()) timer = setTimeout(sumar, ms);
    }
    P.addEventListener('input', function () { programar(delCatalogo() ? 700 : 2200); });
    R.addEventListener('input', function () { programar(1600); });
    if (C) C.addEventListener('input', function () { programar(2200); });
    [P, R, C].forEach(function (el) {
        if (!el) return;
        el.addEventListener('change', function () { if (valido()) sumar(); });
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); if (!sumar()) { var m = $('mensajeFisica'); } }
        });
    });

    /* ---------- Si toca Cobrar con una prenda escrita, se suma primero ---------- */
    var orig = window.registrarVentaFisica;
    if (typeof orig === 'function' && !orig.__vsv2) {
        var envuelta = function () {
            if (valido()) sumar();
            return orig.apply(this, arguments);
        };
        envuelta.__vsv2 = true;
        window.registrarVentaFisica = envuelta;
    }

    /* ---------- El cuadro de escribir se abre solo cuando no hay prendas ---------- */
    var textoSum = null;
    if (typed) {
        var sp = typed.querySelector('summary span');
        if (sp) {
            for (var i = sp.childNodes.length - 1; i >= 0; i--) {
                if (sp.childNodes[i].nodeType === 3 && sp.childNodes[i].textContent.trim()) { textoSum = sp.childNodes[i]; break; }
            }
        }
    }
    var estabaAbierta = false;
    function vigilar() {
        var abierta = sec.classList.contains('abierta');
        var n = 0;
        try { n = carritoFisica.length; } catch (e) { }
        if (abierta && !estabaAbierta && n === 0 && typed) typed.open = true;
        estabaAbierta = abierta;
        if (textoSum) {
            var t = n > 0 ? ' Agregar otra prenda' : ' Sin QR a la mano: escribir la prenda';
            if (textoSum.textContent !== t) textoSum.textContent = t;
        }
    }
    setInterval(vigilar, 400);
    vigilar();
    console.log('[VSV2] prenda se suma sola');
})();
