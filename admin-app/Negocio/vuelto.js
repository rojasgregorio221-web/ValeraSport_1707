/* Negocio/vuelto.js · generado por separar-capas.js · el código está igual que en admin.html */
        function vvEl(id) { return document.getElementById(id); }

        function vvActivo() {
            const el = vvEl('vvActivo');
            return !!(el && el.checked);
        }

        function vvNum(id) {
            const el = vvEl(id);
            if (!el) return 0;
            const n = parseFloat(String(el.value).replace(',', '.'));
            return (isNaN(n) || n < 0) ? 0 : n;
        }

        function vvFmtBs(n) {
            return 'Bs ' + n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function vvFmtUsd(n) { return '$' + n.toFixed(2); }

        function vvTasa() {
            const manual = vvNum('vvTasaManual');
            if (manual > 0) return manual;
            return (typeof tasaBcvAdmin !== 'undefined' && tasaBcvAdmin) ? tasaBcvAdmin : 0;
        }

        function vvMetodo() {
            const sel = vvEl('fisicaMetodoPago');
            return sel ? sel.value : '';
        }

        function vvTotal() {
            return carritoFisica.length ? calcularResumenCarritoFisica().total : 0;
        }

        function vvBilletes(montoEntero) {
            let resto = montoEntero;
            const partes = [];
            [100, 50, 20, 10, 5, 1].forEach(d => {
                const n = Math.floor(resto / d);
                if (n > 0) { partes.push(n + ' × $' + d); resto -= n * d; }
            });
            return partes.join(' + ');
        }

        // La cuenta pura: no toca la pantalla. Se hace en centavos para evitar errores de decimales.
        function vvCuenta() {
            const metodo = vvMetodo();
            const total = Math.min(vvTotal(), 99999);
            const recUsd = Math.min(vvNum('vvRecUsd'), 99999);
            const recBs = Math.min(vvNum('vvRecBs'), 99999999);
            const tasa = vvTasa();
            const r = { metodo: metodo, total: total, recUsd: recUsd, recBs: recBs, tasa: tasa, estado: 'vacio' };
            if (!total) return r;
            if (recBs > 0 && !tasa) { r.estado = 'sinTasa'; return r; }
            if (recUsd === 0 && recBs === 0) return r;

            const baseUsd = esMetodoUsd(metodo) || !tasa;
            let cambioUsd, cambioBs;
            if (baseUsd) {
                const centavos = Math.round(recUsd * 100) + (tasa ? Math.round(recBs / tasa * 100) : 0) - Math.round(total * 100);
                cambioUsd = centavos / 100;
                cambioBs = tasa ? cambioUsd * tasa : null;
            } else {
                const centavos = Math.round(recBs * 100) + Math.round(recUsd * tasa * 100) - Math.round(total * tasa * 100);
                cambioBs = centavos / 100;
                cambioUsd = cambioBs / tasa;
            }
            const diferencia = baseUsd ? cambioUsd : cambioBs;
            r.baseUsd = baseUsd;
            r.cambioUsd = cambioUsd;
            r.cambioBs = cambioBs;
            r.estado = diferencia < -0.004 ? 'falta' : (Math.abs(diferencia) < 0.005 ? 'exacto' : 'vuelto');
            return r;
        }

        // Línea que se agrega a la nota de la venta (solo si hay vuelto)
        function vvTextoVuelto() {
            if (!vvActivo() || vvMetodo() === 'Fiado') return '';
            const c = vvCuenta();
            if (c.estado !== 'vuelto') return '';
            const rec = [];
            if (c.recUsd > 0) rec.push(vvFmtUsd(c.recUsd));
            if (c.recBs > 0) rec.push(vvFmtBs(c.recBs));
            const vuelto = c.baseUsd ? vvFmtUsd(c.cambioUsd) : vvFmtBs(c.cambioBs);
            return 'Pagó ' + rec.join(' + ') + ', vuelto ' + vuelto;
        }
