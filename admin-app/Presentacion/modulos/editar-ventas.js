/* Presentacion/modulos/editar-ventas.js · generado por separar-capas.js · el código está igual que en admin.html */
(function () {
    'use strict';
    if (window.VSE) return;
    if (typeof tarjetaVenta !== 'function' || typeof tarjetaVentaGrupo !== 'function' || typeof listaVentasMemoria === 'undefined') {
        console.warn('[VSE] No encontré la base de Ventas; no se activó.');
        return;
    }
    window.VSE = {};
    /* ---------- Editar una venta ya hecha (lápiz discreto en cada tarjeta) ---------- */
    var css = document.createElement('style');
    css.textContent = [
      '.vsx-lapiz{position:absolute;right:10px;bottom:8px;width:28px;height:28px;border-radius:50%;border:0;background:transparent;color:var(--tenue);opacity:.6;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '.vsx-lapiz:hover,.vsx-lapiz:focus{opacity:1;background:rgba(15,23,42,.07);color:#0284C7}',
      '.vsx-ov{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.45);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:flex;align-items:flex-end;justify-content:center;animation:vseFondo .2s ease both}',
      '@media(min-width:640px){.vsx-ov{align-items:center}}',
      '.vsx-hoja{width:100%;max-width:460px;max-height:92vh;overflow-y:auto;background:#fff;color:#0F172A;border-radius:28px 28px 0 0;padding:10px 20px calc(22px + env(safe-area-inset-bottom,0px));box-shadow:0 -20px 60px -20px rgba(15,23,42,.45);animation:vseSube .35s cubic-bezier(.16,1,.3,1) both}',
      '@media(min-width:640px){.vsx-hoja{border-radius:28px;padding-top:24px}.vse-asa{display:none !important}}',
      '.vse-asa{display:block;width:40px;height:4px;border-radius:9999px;background:#CBD5E1;margin:0 auto 16px}',
      '.vse-cab{display:flex;align-items:center;gap:12px;margin-bottom:18px}',
      '.vse-ico{flex:none;width:44px;height:44px;border-radius:15px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0284C7,#00A8E8);color:#fff;font-size:15px;box-shadow:0 10px 20px -10px rgba(0,150,230,.9)}',
      '.vse-tit{font-family:"Big Shoulders Display","Inter",sans-serif;font-weight:900;text-transform:uppercase;font-size:26px;line-height:.95;color:#0F172A;margin:0}',
      '.vse-sub{margin:4px 0 0;font-size:12px;color:#64748B}',
      '.vse-lista{display:flex;flex-direction:column;gap:10px}',
      '.vse-item{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:18px;padding:14px}',
      '.vse-lbl{display:block;margin:0 0 6px;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#7C8DA3}',
      '.vse-item .vse-lbl:nth-of-type(2){margin-top:12px}',
      '.vse-precio{position:relative}',
      '.vse-precio>span{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-weight:800;color:#64748B;pointer-events:none}',
      '.vse-precio .campo{padding-left:30px;text-align:left;font-weight:800;font-size:16px;height:48px}',
      '.vse-item .vsx-p{height:48px;font-weight:600;text-align:left}',
      '.vse-total{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding:14px 16px;border-radius:18px;background:#F0F9FF;border:1px solid #BAE6FD}',
      '.vse-total>span{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#0369A1}',
      '.vse-total .vse-precio{width:160px}',
      '.vse-total .campo{background:#fff !important;font-size:20px;height:50px}',
      '.vsx-err{margin-top:12px;padding:10px 12px;border-radius:14px;background:#FFF1F2;border:1px solid #FECDD3;color:#BE123C;font-size:12px;font-weight:600}',
      '.vse-botones{display:grid;grid-template-columns:1fr 1.3fr;gap:10px;margin-top:18px}',
      '.vse-botones button{height:50px;border-radius:9999px;font-size:14px}',
      '.vse-botones button:disabled{opacity:.6}',
      '@keyframes vseSube{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}',
      '@keyframes vseFondo{from{opacity:0}to{opacity:1}}'
    ].join('');
    document.head.appendChild(css);

    function idDe(v) { return v && (v.idVenta || v.id || ''); }
    function lapiz(htmlTarjeta, ventas) {
        var ids = ventas.map(idDe).filter(Boolean);
        if (!ids.length) return htmlTarjeta;
        var i = htmlTarjeta.lastIndexOf('</div>');
        if (i === -1) return htmlTarjeta;
        var boton = '<button type="button" class="vsx-lapiz" data-vsx-ed="' + escapeHTML(ids.join('|')) + '" aria-label="Editar esta venta" title="Editar"><i class="fa-solid fa-pen"></i></button>';
        return htmlTarjeta.slice(0, i) + boton + htmlTarjeta.slice(i);
    }
    if (typeof tarjetaVenta === 'function') {
        var tv0 = tarjetaVenta;
        window.tarjetaVenta = function (v) {
            return lapiz(tv0(v).replace('<div class="tarjeta p-4">', '<div class="tarjeta p-4" style="position:relative">'), [v]);
        };
    }
    if (typeof tarjetaVentaGrupo === 'function') {
        var tg0 = tarjetaVentaGrupo;
        window.tarjetaVentaGrupo = function (vs) {
            var h = tg0(vs);
            return lapiz(h.replace('<div class="tarjeta p-4">', '<div class="tarjeta p-4" style="position:relative">'), vs);
        };
    }

    function num(x) { var n = parseFloat(String(x).replace(',', '.')); return isFinite(n) ? n : 0; }
    function r2(n) { return Math.round(n * 100) / 100; }

    function abrirEditor(ids) {
        var ventas = ids.map(function (id) {
            return listaVentasMemoria.filter(function (v) { return String(idDe(v)) === String(id); })[0];
        }).filter(Boolean);
        if (!ventas.length) return;
        var ov = document.createElement('div');
        ov.className = 'vsx-ov';
        var filas = ventas.map(function (v, k) {
            return '<div class="vse-item">' +
                '<label class="vse-lbl">' + (ventas.length > 1 ? 'Prenda ' + (k + 1) : 'Prenda') + '</label>' +
                '<input class="campo vsx-p" data-k="' + k + '" data-c="prod" value="' + escapeHTML(v.producto || '') + '" placeholder="Nombre de la prenda">' +
                '<label class="vse-lbl">Precio</label>' +
                '<div class="vse-precio"><span>$</span><input class="campo cifra vsx-n" data-k="' + k + '" data-c="precio" inputmode="decimal" value="' + r2(num(v.precio)).toFixed(2) + '" aria-label="Precio en dólares"></div>' +
                '</div>';
        }).join('');
        ov.innerHTML =
            '<div class="vsx-hoja" role="dialog" aria-label="Editar venta">' +
              '<span class="vse-asa"></span>' +
              '<div class="vse-cab"><div class="vse-ico"><i class="fa-solid fa-pen"></i></div>' +
              '<div><p class="vse-tit">Editar venta</p><p class="vse-sub">Cambia el nombre o el precio en dólares.</p></div></div>' +
              '<div class="vse-lista">' + filas + '</div>' +
              '<div class="vse-total"><span>Total</span><div class="vse-precio"><span>$</span>' +
              '<input class="campo cifra vsx-n" id="vsxTotal" inputmode="decimal" aria-label="Total en dólares"></div></div>' +
              '<p id="vsxErr" class="vsx-err" style="display:none"></p>' +
              '<div class="vse-botones">' +
              '<button type="button" id="vsxCancel" class="btn-fantasma">Cancelar</button>' +
              '<button type="button" id="vsxGuardar" class="btn-marca">Guardar</button></div>' +
            '</div>';
        document.body.appendChild(ov);

        var precios = ov.querySelectorAll('[data-c="precio"]');
        var total = ov.querySelector('#vsxTotal');
        function sumar() { var t = 0; precios.forEach(function (e) { t += num(e.value); }); total.value = r2(t).toFixed(2); }
        sumar();
        precios.forEach(function (e) { e.addEventListener('input', sumar); });
        total.addEventListener('change', function () {
            // Cambiar el total reparte el cambio proporcionalmente entre las prendas
            var actual = 0; precios.forEach(function (e) { actual += num(e.value); });
            var nuevo = num(total.value);
            if (precios.length === 1) { precios[0].value = r2(nuevo).toFixed(2); }
            else if (actual > 0) {
                var acum = 0;
                precios.forEach(function (e, k) {
                    var p = (k === precios.length - 1) ? r2(nuevo - acum) : r2(num(e.value) * nuevo / actual);
                    acum += p; e.value = p.toFixed(2);
                });
            } else {
                var c = r2(nuevo / precios.length); precios.forEach(function (e) { e.value = c.toFixed(2); });
            }
            sumar();
        });

        function cerrar() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
        ov.addEventListener('click', function (e) { if (e.target === ov) cerrar(); });
        ov.querySelector('#vsxCancel').addEventListener('click', cerrar);

        var btn = ov.querySelector('#vsxGuardar');
        var err = ov.querySelector('#vsxErr');
        btn.addEventListener('click', async function () {
            err.style.display = 'none';
            var cambios = [];
            ventas.forEach(function (v, k) {
                var prod = ov.querySelector('[data-k="' + k + '"][data-c="prod"]').value.trim();
                var precio = r2(num(ov.querySelector('[data-k="' + k + '"][data-c="precio"]').value));
                if (!prod) prod = v.producto || 'Prenda';
                var viejoP = r2(num(v.precio));
                if (prod === (v.producto || '') && precio === viejoP) return;
                var c = { idVenta: idDe(v), producto: prod, precio: precio.toFixed(2) };
                if (v.precioBs != null && v.precioBs !== '') {
                    var factor = viejoP > 0 ? num(v.precioBs) / viejoP : (tasaBcvAdmin || 0);
                    c.precioBs = r2(precio * factor).toFixed(2);
                }
                cambios.push(c);
            });
            if (!cambios.length) { cerrar(); return; }
            btn.disabled = true; btn.textContent = 'Guardando…';
            try {
                for (var j = 0; j < cambios.length; j++) {
                    var resp = await fetch('/api/admin-pedidos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(Object.assign({ password: obtenerPassword(), accion: 'editarVenta' }, cambios[j]))
                    });
                    var d = await resp.json();
                    if (!d.ok) throw new Error(d.error || 'El servidor no aceptó el cambio');
                }
                cerrar();
                cargarVentas();
            } catch (e) {
                err.textContent = 'No se pudo guardar: ' + (e && e.message ? e.message : 'error de conexión');
                err.style.display = 'block';
                btn.disabled = false; btn.textContent = 'Guardar';
                if (cambios.length) cargarVentas();
            }
        });
    }
    document.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-vsx-ed]') : null;
        if (b) { e.stopPropagation(); abrirEditor(b.getAttribute('data-vsx-ed').split('|')); }
    });


    console.log('[VSE] editar ventas activo');
})();
