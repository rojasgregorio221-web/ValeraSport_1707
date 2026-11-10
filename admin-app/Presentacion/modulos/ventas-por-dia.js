/* Presentacion/modulos/ventas-por-dia.js · generado por separar-capas.js · el código está igual que en admin.html */
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    if (window.VSX) return;
    if (typeof fechaLocalISO !== 'function' || typeof renderizarListaVentas !== 'function' || typeof filtrarVentasVista !== 'function') {
        console.warn('[VSX] No encontré la base de Ventas; no se activó.');
        return;
    }
    window.VSX = {};

    function hoyISO() { return fechaLocalISO(new Date()); }

    /* ---------- Bloques que se abren al tocar ---------- */
    function hacerPlegable(id) {
        var b = $(id);
        if (!b || b.getAttribute('data-vsx')) return;
        var primero = b.firstElementChild;
        if (!primero) return;
        var rotulo = primero.classList.contains('rotulo') ? primero : primero.querySelector('.rotulo');
        if (!rotulo) return;
        b.setAttribute('data-vsx', '1');

        var cuerpo = document.createElement('div');
        cuerpo.className = 'vsx-cuerpo';
        while (primero.nextSibling) cuerpo.appendChild(primero.nextSibling);

        var cab = document.createElement('button');
        cab.type = 'button';
        cab.className = 'vsx-cab';
        cab.setAttribute('aria-expanded', 'false');
        b.insertBefore(cab, primero);
        cab.appendChild(rotulo);
        if (primero !== rotulo && primero.parentNode) primero.parentNode.removeChild(primero);
        var chev = document.createElement('i');
        chev.className = 'fa-solid fa-chevron-down vsx-chev';
        cab.appendChild(chev);
        b.appendChild(cuerpo);

        cab.addEventListener('click', function () {
            var abierto = b.classList.toggle('vsx-abierto');
            cab.setAttribute('aria-expanded', String(abierto));
        });
    }
    hacerPlegable('bloqueReporte');
    hacerPlegable('bloqueSemanas');

    /* ---------- Ver las ventas de cualquier día ---------- */
    var ultimo = $('btnFiltroVentasTodas');
    var resumen = $('resumenVentasTarjeta');
    if (!ultimo || !resumen) { console.warn('[VSX] No encontré los filtros de Ventas.'); return; }

    if (!$('btnFiltroVentasDia')) {
        var bd = document.createElement('button');
        bd.type = 'button';
        bd.id = 'btnFiltroVentasDia';
        bd.className = 'seg-btn';
        bd.setAttribute('onclick', "filtrarVentasVista('dia')");
        bd.innerHTML = '<i class="fa-regular fa-calendar" style="margin-right:5px"></i>Otro día';
        ultimo.parentNode.insertBefore(bd, ultimo.nextSibling);
    }

    var barra = document.createElement('div');
    barra.id = 'vsxDia';
    barra.className = 'vsx-dia hidden';
    barra.innerHTML =
        '<button type="button" id="vsxPrev" class="btn-fantasma vsx-flecha" aria-label="Día anterior"><i class="fa-solid fa-chevron-left"></i></button>' +
        '<input type="date" id="vsxFecha" class="campo cifra" aria-label="Elegir el día">' +
        '<button type="button" id="vsxNext" class="btn-fantasma vsx-flecha" aria-label="Día siguiente"><i class="fa-solid fa-chevron-right"></i></button>' +
        '<button type="button" id="vsxHoy" class="btn-fantasma vsx-hoy">Hoy</button>';
    resumen.parentNode.insertBefore(barra, resumen);

    var campo = $('vsxFecha');

    function aplicarFecha() {
        fechaVentasElegida = campo.value || hoyISO();
        renderizarListaVentas();
    }
    function mover(n) {
        var base = campo.value || hoyISO();
        var d = new Date(base + 'T00:00:00');
        d.setDate(d.getDate() + n);
        campo.value = fechaLocalISO(d);
        aplicarFecha();
    }
    $('vsxPrev').addEventListener('click', function () { mover(-1); });
    $('vsxNext').addEventListener('click', function () { mover(1); });
    $('vsxHoy').addEventListener('click', function () { campo.value = hoyISO(); aplicarFecha(); });
    campo.addEventListener('change', aplicarFecha);

    window.etiquetaDiaElegido = function () {
        var f = fechaVentasElegida || hoyISO();
        try { return formatearEncabezadoFechaVenta(f + 'T12:00:00'); } catch (e) { return f; }
    };

    window.filtrarVentasVista = function (tipo) {
        filtroVentas = tipo;
        var mapa = { hoy: 'btnFiltroVentasHoy', semana: 'btnFiltroVentasSemana', todas: 'btnFiltroVentasTodas', dia: 'btnFiltroVentasDia' };
        Object.keys(mapa).forEach(function (k) {
            var e = $(mapa[k]);
            if (e) e.className = (k === tipo) ? 'seg-btn on' : 'seg-btn';
        });
        barra.classList.toggle('hidden', tipo !== 'dia');
        if (tipo === 'dia') {
            if (!campo.value) campo.value = hoyISO();
            fechaVentasElegida = campo.value;
        }
        renderizarListaVentas();
    };

    console.log('[VSX] plegables y ventas por día activos');
})();
