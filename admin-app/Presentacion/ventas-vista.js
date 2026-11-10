/* Presentacion/ventas-vista.js · generado por separar-capas.js · el código está igual que en admin.html */
        // ---------- HISTORIAL DE VENTAS Y FILTRADO ----------
        function filtrarVentasVista(tipo) {
            filtroVentas = tipo;
            document.getElementById('btnFiltroVentasHoy').className = tipo === 'hoy' ? 'seg-btn on' : 'seg-btn';
            document.getElementById('btnFiltroVentasSemana').className = tipo === 'semana' ? 'seg-btn on' : 'seg-btn';
            document.getElementById('btnFiltroVentasTodas').className = tipo === 'todas' ? 'seg-btn on' : 'seg-btn';
            renderizarListaVentas();
        }

        function filtrarMonedaVentas(tipo) {
            filtroMonedaVentas = tipo;
            const mapa = {
                ambas: document.getElementById('btnMonedaAmbas'),
                bs: document.getElementById('btnMonedaBs'),
                usd: document.getElementById('btnMonedaUsd')
            };
            Object.keys(mapa).forEach(k => {
                mapa[k].className = k === tipo ? 'seg-btn on' : 'seg-btn';
            });
            renderizarListaVentas();
        }

        function renderizarListaVentas() {
            const lista = document.getElementById('listaVentas');
            const sinVentas = document.getElementById('sinVentas');
            const totalBsEl = document.getElementById('ventasTotalBs');
            const totalUsdEl = document.getElementById('ventasTotalDolares');
            const cantidadBsEl = document.getElementById('ventasCantidadBs');
            const cantidadUsdEl = document.getElementById('ventasCantidadUsd');
            const filtroLabelEl = document.getElementById('ventasFiltroLabel');

            const hoyStr = new Date().toLocaleDateString('es-VE');

            // Las fiadas pendientes no cuentan como dinero cobrado todavía
            let filtradasPeriodo = listaVentasMemoria.filter(v => (v.metodoPago || '').toLowerCase().trim() !== 'fiado');

            if (filtroVentas === 'hoy') {
                filtradasPeriodo = filtradasPeriodo.filter(v => {
                    if (!v.fecha) return false;
                    const fStr = new Date(v.fecha).toLocaleDateString('es-VE');
                    return fStr === hoyStr;
                });
            } else if (filtroVentas === 'semana') {
                const arranqueSemana = inicioDeSemana(new Date());
                filtradasPeriodo = filtradasPeriodo.filter(v => v.fecha && new Date(v.fecha) >= arranqueSemana);
            } else if (filtroVentas === 'dia') {
                const diaElegido = fechaVentasElegida || fechaLocalISO(new Date());
                filtradasPeriodo = filtradasPeriodo.filter(v => v.fecha && fechaLocalISO(new Date(v.fecha)) === diaElegido);
            }

            // El repaso semana por semana siempre se calcula sobre todo lo que hay en memoria
            renderizarSemanas();

            // TOTALES POR MONEDA, SIEMPRE SEPARADOS (SIN CONVERTIR UNO EN OTRO)
            const totales = calcularTotalesPorMoneda(filtradasPeriodo);
            if (totalBsEl) totalBsEl.textContent = 'Bs ' + totales.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (totalUsdEl) totalUsdEl.textContent = '$' + totales.totalUsd.toFixed(2);
            if (cantidadBsEl) cantidadBsEl.textContent = totales.piezasBs + (totales.piezasBs === 1 ? ' prenda' : ' prendas');
            if (cantidadUsdEl) cantidadUsdEl.textContent = totales.piezasUsd + (totales.piezasUsd === 1 ? ' prenda' : ' prendas');
            if (filtroLabelEl) filtroLabelEl.textContent = filtroVentas === 'hoy' ? 'Hoy' : (filtroVentas === 'semana' ? 'Esta semana' : (filtroVentas === 'dia' ? etiquetaDiaElegido() : 'Todo lo registrado'));

            // Filtro de moneda para la LISTA (el resumen de arriba siempre muestra ambas)
            let filtradas = filtradasPeriodo;
            if (filtroMonedaVentas === 'bs') filtradas = filtradas.filter(v => !esMetodoUsd(v.metodoPago));
            if (filtroMonedaVentas === 'usd') filtradas = filtradas.filter(v => esMetodoUsd(v.metodoPago));

            if (!filtradas.length) {
                lista.innerHTML = '';
                sinVentas.textContent = filtroVentas === 'hoy'
                    ? 'Hoy todavía no hay ventas.'
                    : (filtroVentas === 'semana' ? 'Esta semana todavía no hay ventas.' : (filtroVentas === 'dia' ? 'Ese día no hay ventas registradas.' : 'Todavía no hay ventas registradas.'));
                sinVentas.classList.remove('hidden');
                return;
            }

            sinVentas.classList.add('hidden');

            // Cada grupo es una transacción completa; encima de eso se separan por día.
            const gruposTransaccion = agruparVentas(filtradas);
            const porDia = new Map();
            const ordenDias = [];
            gruposTransaccion.forEach(grupo => {
                const fechaRef = grupo[0].fecha || '';
                const claveDia = fechaRef ? new Date(fechaRef).toLocaleDateString('es-VE') : 'sin-fecha';
                if (!porDia.has(claveDia)) { porDia.set(claveDia, { fechaRef, grupos: [] }); ordenDias.push(claveDia); }
                porDia.get(claveDia).grupos.push(grupo);
            });

            lista.innerHTML = ordenDias.map(claveDia => {
                const { fechaRef, grupos } = porDia.get(claveDia);
                const encabezado = fechaRef ? formatearEncabezadoFechaVenta(fechaRef) : 'Sin fecha';
                const tarjetas = grupos.map(g => g.length > 1 ? tarjetaVentaGrupo(g) : tarjetaVenta(g[0])).join('');
                return '<div class="relative">' +
                        '<span class="hilo-fecha pointer-events-none absolute left-0 top-2 bottom-2" aria-hidden="true"></span>' +
                        '<div class="pl-5">' +
                            '<p class="display text-[26px] mb-3">' + escapeHTML(encabezado) + '</p>' +
                            '<div class="space-y-3">' + tarjetas + '</div>' +
                        '</div>' +
                    '</div>';
            }).join('');
        }

        function renderizarSemanas() {
            const cont = document.getElementById('listaSemanas');
            const bloque = document.getElementById('bloqueSemanas');
            if (!cont || !bloque) return;

            const cobradas = listaVentasMemoria.filter(v => v.fecha && (v.metodoPago || '').toLowerCase().trim() !== 'fiado');
            if (!cobradas.length) {
                bloque.classList.add('hidden');
                return;
            }
            bloque.classList.remove('hidden');

            const porSemana = new Map();
            cobradas.forEach(v => {
                const clave = claveSemana(new Date(v.fecha));
                if (!porSemana.has(clave)) porSemana.set(clave, { inicio: inicioDeSemana(new Date(v.fecha)), ventas: [] });
                porSemana.get(clave).ventas.push(v);
            });

            const claveEsta = claveSemana(new Date());
            const semanas = [...porSemana.entries()]
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 8);

            cont.innerHTML = semanas.map(([clave, datos]) => {
                const t = calcularTotalesPorMoneda(datos.ventas);
                const esActual = clave === claveEsta;
                const piezas = t.piezasBs + t.piezasUsd;
                return `
                    <div class="sub-panel px-4 py-3 flex items-center justify-between gap-3" ${esActual ? 'style="border-color: rgba(21, 153, 208,0.45); background: rgba(21, 153, 208,0.07)"' : ''}>
                        <div class="min-w-0">
                            <p class="text-xs font-bold">${escapeHTML(etiquetaSemana(datos.inicio))}</p>
                            <p class="text-[11px] mt-0.5" style="color: var(--tenue)">${escapeHTML(rangoSemana(datos.inicio))} · ${piezas} ${piezas === 1 ? 'prenda' : 'prendas'}</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <span class="cifra text-sm font-bold block" style="color: var(--cyan)">Bs ${t.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span class="cifra text-sm font-bold block" style="color: #6EE7B7">$${t.totalUsd.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            }).join('');

            cont.classList.toggle('hidden', !semanasVisibles);
        }

        function toggleSemanas() {
            semanasVisibles = !semanasVisibles;
            const cont = document.getElementById('listaSemanas');
            const btn = document.getElementById('btnToggleSemanas');
            if (cont) cont.classList.toggle('hidden', !semanasVisibles);
            if (btn) btn.textContent = semanasVisibles ? 'Ocultar' : 'Ver';
        }

        // Etiqueta legible para cada grupo de fecha en Ventas (Hoy / Ayer / día completo)
        function formatearEncabezadoFechaVenta(fechaISO) {
            const d = new Date(fechaISO);
            const hoyStr = new Date().toLocaleDateString('es-VE');
            const ayerRef = new Date();
            ayerRef.setDate(ayerRef.getDate() - 1);
            const dStr = d.toLocaleDateString('es-VE');
            if (dStr === hoyStr) return 'Hoy';
            if (dStr === ayerRef.toLocaleDateString('es-VE')) return 'Ayer';
            const texto = d.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });
            return texto.charAt(0).toUpperCase() + texto.slice(1);
        }

        function tarjetaVenta(venta) {
            const fecha = venta.fecha ? new Date(venta.fecha).toLocaleString('es-VE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '';
            const canalTexto = venta.canal || 'Venta';
            const esFisica = canalTexto.toLowerCase().indexOf('f') === 0;
            const iconoCanal = esFisica ? 'fa-store' : 'fa-globe';
            const colorCanal = esFisica ? 'var(--cyan)' : 'var(--fucsia)';

            const esUsd = esMetodoUsd(venta.metodoPago);
            const montoPrincipal = esUsd
                ? '$' + Number(venta.precio || 0).toFixed(2)
                : 'Bs ' + (venta.precioBs != null && venta.precioBs !== '' ? Number(venta.precioBs) : (tasaBcvAdmin ? (Number(venta.precio) || 0) * tasaBcvAdmin : 0)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const colorMonto = esUsd ? '#6EE7B7' : 'var(--hueso)';

            return `
                <div class="tarjeta p-4">
                    <div class="flex justify-between items-start gap-3 mb-1.5">
                        <div class="min-w-0">
                            <span class="text-[10px] font-bold uppercase tracking-[0.16em] block mb-1.5" style="color: ${colorCanal}">
                                <i class="fa-solid ${iconoCanal} mr-1.5"></i>${escapeHTML(canalTexto)}
                            </span>
                            <p class="text-sm font-semibold">${escapeHTML(venta.producto || 'Prenda')}</p>
                            <p class="text-[11px] mt-0.5" style="color: var(--tenue)">${escapeHTML(fecha)}${venta.categoria ? ' · ' + escapeHTML(venta.categoria) : ''}</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <span class="cifra-grande text-[22px] block" style="color: ${colorMonto}">${montoPrincipal}</span>
                            <span class="text-[9px] uppercase tracking-[0.16em] font-bold" style="color: var(--tenue)">${esUsd ? 'Divisas' : 'Bolívares'}</span>
                        </div>
                    </div>
                    ${(venta.metodoPago || venta.correo) ? `
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] mt-3 pt-2.5" style="color: var(--gris); border-top: 1px solid var(--linea)">
                        ${venta.metodoPago ? `<span><i class="fa-solid fa-credit-card mr-1.5" style="color: var(--tenue)"></i>${escapeHTML(venta.metodoPago)}</span>` : ''}
                        ${venta.correo ? `<span><i class="fa-solid fa-envelope mr-1.5" style="color: var(--tenue)"></i>${escapeHTML(venta.correo)}</span>` : ''}
                    </div>` : ''}
                    ${venta.nota ? `
                    <div class="mt-2.5 rounded-xl px-3 py-2 text-[11px] txt-warn" style="background: rgba(245,158,11,0.10); border: 1px solid rgba(245,158,11,0.25)">
                        <i class="fa-solid fa-note-sticky mr-1.5"></i>${escapeHTML(venta.nota)}
                    </div>` : ''}
                </div>
            `;
        }

        // Venta de varias prendas en una sola transacción: detalle prenda por prenda y total abajo.
        function tarjetaVentaGrupo(ventas) {
            const primera = ventas[0];
            const fecha = primera.fecha ? new Date(primera.fecha).toLocaleString('es-VE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '';
            const canalTexto = primera.canal || 'Venta';
            const esFisica = canalTexto.toLowerCase().indexOf('f') === 0;
            const iconoCanal = esFisica ? 'fa-store' : 'fa-globe';
            const colorCanal = esFisica ? 'var(--cyan)' : 'var(--fucsia)';
            const esUsd = esMetodoUsd(primera.metodoPago);

            const totalUsd = ventas.reduce((s, v) => s + (Number(v.precio) || 0), 0);
            const totalBsCalc = ventas.reduce((s, v) => s + (v.precioBs != null && v.precioBs !== '' ? Number(v.precioBs) : (tasaBcvAdmin ? (Number(v.precio) || 0) * tasaBcvAdmin : 0)), 0);
            const notaComun = primera.nota || '';

            const listaItems = ventas.map(v => {
                const itemMonto = esUsd
                    ? '$' + Number(v.precio || 0).toFixed(2)
                    : 'Bs ' + (v.precioBs != null && v.precioBs !== '' ? Number(v.precioBs) : (tasaBcvAdmin ? (Number(v.precio) || 0) * tasaBcvAdmin : 0)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return `
                    <div class="flex justify-between items-center gap-3 text-sm py-2" style="border-bottom: 1px solid var(--linea)">
                        <div class="min-w-0">
                            <span>${escapeHTML(v.producto || 'Prenda')}</span>
                            <span class="text-[10px] uppercase tracking-wide ml-2" style="color: var(--tenue)">${escapeHTML(v.categoria || 'Variados')}</span>
                        </div>
                        <span class="cifra text-xs font-bold flex-shrink-0" style="color: var(--gris)">${itemMonto}</span>
                    </div>
                `;
            }).join('');

            const montoPrincipal = esUsd ? '$' + totalUsd.toFixed(2) : 'Bs ' + totalBsCalc.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const colorMonto = esUsd ? '#6EE7B7' : 'var(--hueso)';

            return `
                <div class="tarjeta p-4">
                    <div class="flex justify-between items-start gap-3 mb-2">
                        <div class="min-w-0">
                            <span class="text-[10px] font-bold uppercase tracking-[0.16em] block mb-1.5" style="color: ${colorCanal}">
                                <i class="fa-solid ${iconoCanal} mr-1.5"></i>${escapeHTML(canalTexto)} · ${ventas.length} prendas
                            </span>
                            <p class="text-[11px]" style="color: var(--tenue)">${escapeHTML(fecha)}</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <span class="cifra-grande text-[22px] block" style="color: ${colorMonto}">${montoPrincipal}</span>
                            <span class="text-[9px] uppercase tracking-[0.16em] font-bold" style="color: var(--tenue)">${esUsd ? 'Divisas' : 'Bolívares'}</span>
                        </div>
                    </div>

                    <div class="sub-panel px-4 py-1 mt-3">${listaItems}</div>

                    ${(primera.metodoPago || primera.correo) ? `
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] mt-3 pt-2.5" style="color: var(--gris); border-top: 1px solid var(--linea)">
                        ${primera.metodoPago ? `<span><i class="fa-solid fa-credit-card mr-1.5" style="color: var(--tenue)"></i>${escapeHTML(primera.metodoPago)}</span>` : ''}
                        ${primera.correo ? `<span><i class="fa-solid fa-envelope mr-1.5" style="color: var(--tenue)"></i>${escapeHTML(primera.correo)}</span>` : ''}
                    </div>` : ''}
                    ${notaComun ? `
                    <div class="mt-2.5 rounded-xl px-3 py-2 text-[11px] txt-warn" style="background: rgba(245,158,11,0.10); border: 1px solid rgba(245,158,11,0.25)">
                        <i class="fa-solid fa-note-sticky mr-1.5"></i>${escapeHTML(notaComun)}
                    </div>` : ''}
                </div>
            `;
        }
