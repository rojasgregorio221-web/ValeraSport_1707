/* Presentacion/vuelto-vista.js · generado por separar-capas.js · el código está igual que en admin.html */
        function vvRellenarBsExacto() {
            const total = vvTotal();
            const tasa = vvTasa();
            vvEl('vvRecBs').value = (total > 0 && tasa) ? (total * tasa).toFixed(2) : '';
            vvEl('vvRecUsd').value = '';
        }

        // Se prendió o apagó el interruptor
        function vvAlActivar() {
            if (vvActivo()) {
                if (VV_ELECTRONICOS.includes(vvMetodo())) {
                    vvAutoBs = true;
                    vvRellenarBsExacto();
                }
            } else {
                vvLimpiar(true);
            }
            vvCalcular();
        }

        // Cambió "Cómo pagó" en el formulario de la venta
        function vvCambioMetodo() {
            const estabaAuto = vvAutoBs;
            vvModo = null;
            vvAutoBs = vvActivo() && VV_ELECTRONICOS.includes(vvMetodo());
            if (vvAutoBs) vvRellenarBsExacto();
            else if (estabaAuto) vvEl('vvRecBs').value = '';
            vvCalcular();
        }

        function vvCambioTasa() {
            if (vvAutoBs) vvRellenarBsExacto();
            vvCalcular();
        }

        function vvAlEscribirUsd() {
            if (vvAutoBs && vvEl('vvRecUsd').value) { vvAutoBs = false; vvEl('vvRecBs').value = ''; }
            vvCalcular();
        }

        function vvAlEscribirBs() {
            vvAutoBs = false;
            vvCalcular();
        }

        function vvPonerUsd(valor) {
            if (vvAutoBs) { vvAutoBs = false; vvEl('vvRecBs').value = ''; }
            const total = vvTotal();
            vvEl('vvRecUsd').value = (valor === 'exacto') ? (total > 0 ? total.toFixed(2) : '') : String(valor);
            vvCalcular();
        }

        function vvPonerBs(valor) {
            vvAutoBs = false;
            vvEl('vvRecBs').value = String(valor);
            vvCalcular();
        }

        function vvSetModo(modo) {
            vvModo = modo;
            vvCalcular();
        }

        // todo = true: apaga el interruptor y borra también la tasa que se escribió a mano
        function vvLimpiar(todo) {
            ['vvRecUsd', 'vvRecBs'].forEach(id => { const el = vvEl(id); if (el) el.value = ''; });
            vvModo = null;
            vvAutoBs = false;
            if (todo === true) {
                const sw = vvEl('vvActivo');
                if (sw) sw.checked = false;
                const t = vvEl('vvTasaManual');
                if (t) t.value = '';
            }
            vvCalcular();
        }

        function vvRenderAtajosBs(total, tasa) {
            const cont = vvEl('vvAtajosBs');
            if (!cont) return;
            if (!total || !tasa) { cont.innerHTML = ''; return; }
            const debido = Math.round(total * tasa * 100) / 100;
            const opciones = [debido];
            [100, 500, 1000].forEach(paso => {
                const redondeado = Math.ceil(debido / paso) * paso;
                if (redondeado > debido && !opciones.includes(redondeado)) opciones.push(redondeado);
            });
            cont.innerHTML = opciones.map((v, i) =>
                '<button type="button" onclick="vvPonerBs(' + v + ')" class="btn-fantasma px-2.5 py-1 rounded-xl text-xs cifra">' +
                (i === 0 ? 'Exacto' : vvFmtBs(v).replace(',00', '')) + '</button>'
            ).join('');
        }

        function vvCalcular() {
            const bloque = vvEl('bloqueVuelto');
            if (!bloque) return;

            const visible = carritoFisica.length > 0 && vvMetodo() !== 'Fiado';
            bloque.classList.toggle('hidden', !visible);
            if (!visible) return;

            const activo = vvActivo();
            vvEl('vvCuerpo').classList.toggle('hidden', !activo);
            if (!activo) return;

            // El Bs exacto de los pagos electrónicos sigue al total de la venta
            if (vvAutoBs) vvRellenarBsExacto();

            const c = vvCuenta();
            const tasa = c.tasa;
            vvUltimaTasa = tasa;
            const tasaManual = vvNum('vvTasaManual') > 0;

            vvEl('vvTotalUsd').textContent = vvFmtUsd(c.total);
            vvEl('vvTotalBs').textContent = tasa ? ' · ' + vvFmtBs(c.total * tasa) : '';
            vvEl('vvTasaInfo').textContent = tasa
                ? 'Tasa: Bs ' + tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (tasaManual ? ' (manual)' : ' (BCV)') + ' · cambiar'
                : 'Sin tasa BCV · escríbela aquí';
            vvRenderAtajosBs(c.total, tasa);

            const aviso = vvEl('vvAviso');
            const resultado = vvEl('vvResultado');
            aviso.classList.add('hidden');
            resultado.classList.add('hidden');

            if (c.estado === 'sinTasa') {
                aviso.textContent = 'Para recibir bolívares hace falta la tasa. Escríbela en "Cambiar la tasa".';
                aviso.className = 'msg msg-warn';
                return;
            }
            if (c.estado === 'vacio') return;

            const caja = vvEl('vvCaja');
            const rotulo = vvEl('vvRotulo');
            const principal = vvEl('vvPrincipal');
            const secundario = vvEl('vvSecundario');
            const split = vvEl('vvSplit');
            resultado.classList.remove('hidden');

            if (c.estado === 'falta') {
                rotulo.textContent = 'Todavía falta por cobrar';
                principal.textContent = c.baseUsd ? vvFmtUsd(-c.cambioUsd) : vvFmtBs(-c.cambioBs);
                principal.className = 'cifra-grande text-[30px] txt-danger';
                secundario.textContent = c.baseUsd ? (tasa ? vvFmtBs(-c.cambioBs) : '') : vvFmtUsd(-c.cambioUsd);
                caja.style.background = 'rgba(244,63,94,0.10)';
                caja.style.border = '1px solid rgba(244,63,94,0.30)';
                split.classList.add('hidden');
                return;
            }

            if (c.estado === 'exacto') {
                rotulo.textContent = 'Pago exacto';
                principal.textContent = 'Sin vuelto';
                principal.className = 'cifra-grande text-[30px] txt-ok';
                secundario.textContent = '';
                caja.style.background = 'rgba(16,185,129,0.10)';
                caja.style.border = '1px solid rgba(16,185,129,0.30)';
                split.classList.add('hidden');
                return;
            }

            // Hay vuelto
            rotulo.textContent = 'Vuelto';
            principal.textContent = c.baseUsd ? vvFmtUsd(c.cambioUsd) : vvFmtBs(c.cambioBs);
            principal.className = 'cifra-grande text-[30px]';
            secundario.textContent = c.baseUsd ? (tasa ? '≈ ' + vvFmtBs(c.cambioBs) : '') : '≈ ' + vvFmtUsd(c.cambioUsd);
            caja.style.background = 'rgba(21,153,208,0.08)';
            caja.style.border = '1px solid var(--linea)';

            // Desglose: solo si hay tasa (si no, todo es en dólares y no hay nada que repartir)
            if (!tasa) { split.classList.add('hidden'); return; }
            split.classList.remove('hidden');

            const modo = vvModo || (c.baseUsd ? 'enteros' : 'bs');
            let darUsd;
            if (modo === 'usd') darUsd = c.cambioUsd;
            else if (modo === 'bs') darUsd = 0;
            else darUsd = Math.floor(c.cambioUsd + 1e-9);

            let restoBs = (modo === 'bs' && !c.baseUsd) ? c.cambioBs : (c.cambioUsd - darUsd) * tasa;
            restoBs = Math.round(restoBs * 100) / 100;
            if (restoBs < 0) restoBs = 0;

            const idsModo = { usd: 'vvModoUsd', enteros: 'vvModoEnteros', bs: 'vvModoBs' };
            Object.keys(idsModo).forEach(m => {
                vvEl(idsModo[m]).className = (m === modo) ? 'seg-btn on' : 'seg-btn';
            });

            const enteros = Math.floor(darUsd + 1e-9);
            const centavosSueltos = Math.round((darUsd - enteros) * 100);
            const billetes = vvBilletes(enteros);
            const detalle = [billetes, centavosSueltos > 0 ? centavosSueltos + '¢' : ''].filter(Boolean).join(' + ');
            const partes = [];
            if (darUsd >= 0.005) partes.push('Dale ' + vvFmtUsd(darUsd) + (detalle ? ' (' + detalle + ')' : ''));
            if (restoBs >= 0.005) partes.push((partes.length ? '' : 'Dale ') + vvFmtBs(restoBs));
            vvEl('vvDesglose').textContent = partes.join(' + ');
        }
