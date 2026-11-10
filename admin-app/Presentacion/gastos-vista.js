/* Presentacion/gastos-vista.js · generado por separar-capas.js · el código está igual que en admin.html */
        // ===================================================================
        // GASTOS: DEL DÍA Y DE LA SEMANA
        // ===================================================================
        function toggleFormularioGasto() {
            const form = document.getElementById('formularioGasto');
            form.classList.toggle('hidden');
        }

        function filtrarGastosVista(tipo) {
            filtroGastos = tipo;
            const clases = {
                hoy: document.getElementById('btnFiltroGastosHoy'),
                semana: document.getElementById('btnFiltroGastosSemana'),
                todos: document.getElementById('btnFiltroGastosTodos')
            };
            Object.keys(clases).forEach(k => {
                clases[k].className = k === tipo ? 'seg-btn on' : 'seg-btn';
            });
            renderizarListaGastos();
        }

        function renderizarListaGastos() {
            const lista = document.getElementById('listaGastos');
            const sinGastos = document.getElementById('sinGastos');

            const hoy = new Date();
            const hoyStr = hoy.toLocaleDateString('es-VE');
            const inicioSemana = inicioDeSemana(hoy);

            let filtrados = listaGastosMemoria;
            if (filtroGastos === 'hoy') {
                filtrados = listaGastosMemoria.filter(g => g.fecha && new Date(g.fecha).toLocaleDateString('es-VE') === hoyStr);
            } else if (filtroGastos === 'semana') {
                filtrados = listaGastosMemoria.filter(g => g.fecha && new Date(g.fecha) >= inicioSemana);
            }

            // Totales de las tarjetas de arriba (siempre sobre el total, no sobre el filtro)
            const totalHoy = listaGastosMemoria
                .filter(g => g.fecha && new Date(g.fecha).toLocaleDateString('es-VE') === hoyStr)
                .reduce((s, g) => s + (Number(g.monto) || 0), 0);
            const totalSemana = listaGastosMemoria
                .filter(g => g.fecha && new Date(g.fecha) >= inicioSemana)
                .reduce((s, g) => s + (Number(g.monto) || 0), 0);
            document.getElementById('gastosHoyTotal').textContent = '$' + totalHoy.toFixed(2);
            const gHoyBsEl = document.getElementById('gastosHoyTotalBs');
            if (gHoyBsEl) gHoyBsEl.textContent = tasaBcvAdmin ? 'Bs ' + (totalHoy * tasaBcvAdmin).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

            document.getElementById('gastosSemanaTotal').textContent = '$' + totalSemana.toFixed(2);
            const gSemBsEl = document.getElementById('gastosSemanaTotalBs');
            if (gSemBsEl) gSemBsEl.textContent = tasaBcvAdmin ? 'Bs ' + (totalSemana * tasaBcvAdmin).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

            if (!filtrados.length) {
                lista.innerHTML = '';
                sinGastos.classList.remove('hidden');
                return;
            }
            sinGastos.classList.add('hidden');
            lista.innerHTML = filtrados
                .slice()
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                .map(g => tarjetaGasto(g)).join('');
        }

        function tarjetaGasto(g) {
            const fecha = g.fecha ? new Date(g.fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
            const idAttr = escapeHTML(g.idGasto || g.id || '');
            const montoBsNum = tasaBcvAdmin ? (Number(g.monto || 0) * tasaBcvAdmin) : null;
            return `
                <div class="tarjeta p-4 flex justify-between items-start gap-3">
                    <div class="min-w-0">
                        <p class="text-sm font-bold truncate">${escapeHTML(g.concepto || 'Gasto')}</p>
                        <p class="text-[11px] mt-0.5" style="color: var(--tenue)">${escapeHTML(fecha)}${g.categoria ? ' · ' + escapeHTML(g.categoria) : ''}</p>
                        ${g.nota ? `<p class="text-[11px] mt-1.5" style="color: var(--gris)"><i class="fa-solid fa-note-sticky mr-1.5"></i>${escapeHTML(g.nota)}</p>` : ''}
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <div class="text-right">
                            <span class="cifra-grande text-[22px] block" style="color: #FDA4AF">-$${Number(g.monto || 0).toFixed(2)}</span>
                            ${montoBsNum ? `<span class="cifra text-[11px] font-bold block" style="color: rgba(253,164,175,0.7)">-Bs ${montoBsNum.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>` : ''}
                        </div>
                        ${idAttr ? `<button type="button" data-id="${idAttr}" onclick="eliminarGasto(this.dataset.id)" title="Borrar" class="icon-btn w-9 h-9 flex items-center justify-center rounded-xl" style="color: var(--tenue)"><i class="fa-solid fa-trash-can text-xs"></i></button>` : ''}
                    </div>
                </div>
            `;
        }
