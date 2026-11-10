/* Presentacion/fiados-vista.js · generado por separar-capas.js · el código está igual que en admin.html */
        function filtrarFiadosVista(tipo) {
            filtroFiados = tipo;
            document.getElementById('btnFiltroFiadosPendientes').className = tipo === 'pendientes' ? 'seg-btn on' : 'seg-btn';
            document.getElementById('btnFiltroFiadosPagados').className = tipo === 'pagados' ? 'seg-btn on' : 'seg-btn';
            renderizarListaFiados();
        }

        function renderizarListaFiados() {
            const lista = document.getElementById('listaFiados');
            const sinFiados = document.getElementById('sinFiados');

            const filtradas = listaFiadosMemoria.filter(f => filtroFiados === 'pagados' ? f.estadoPago === 'pagado' : f.estadoPago !== 'pagado');

            let totalPendiente = 0, totalVencido = 0;
            listaFiadosMemoria.forEach(f => {
                if (f.estadoPago === 'pagado') return;
                const monto = Number(f.total || f.precio || 0);
                totalPendiente += monto;
                if (f.fechaPago && diasEntreFechas(f.fechaPago) < 0) totalVencido += monto;
            });
            document.getElementById('fiadosTotalPendiente').textContent = '$' + totalPendiente.toFixed(2);
            const pendBsEl = document.getElementById('fiadosTotalPendienteBs');
            if (pendBsEl) pendBsEl.textContent = tasaBcvAdmin ? 'Bs ' + (totalPendiente * tasaBcvAdmin).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

            document.getElementById('fiadosTotalVencido').textContent = '$' + totalVencido.toFixed(2);
            const vencBsEl = document.getElementById('fiadosTotalVencidoBs');
            if (vencBsEl) vencBsEl.textContent = tasaBcvAdmin ? 'Bs ' + (totalVencido * tasaBcvAdmin).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

            if (!filtradas.length) {
                lista.innerHTML = '';
                sinFiados.textContent = filtroFiados === 'pagados' ? 'Todavía nadie te ha pagado un fiado.' : 'No hay nada por cobrar. 🎉';
                sinFiados.classList.remove('hidden');
                return;
            }
            sinFiados.classList.add('hidden');
            lista.innerHTML = filtradas.map(f => tarjetaFiado(f)).join('');
        }

        function tarjetaFiado(f) {
            const pagado = f.estadoPago === 'pagado';
            const estado = pagado ? { texto: 'Pagado', tono: 'ok' } : estadoFiado(f.fechaPago);
            const fechaVenta = f.fecha ? new Date(f.fecha).toLocaleDateString('es-VE') : '';
            const total = Number(f.total || f.precio || 0).toFixed(2);
            const totalBsNum = tasaBcvAdmin ? (Number(total) * tasaBcvAdmin) : null;
            const idAttr = escapeHTML(f.idVenta || f.id || '');
            const borde = estado.tono === 'danger' ? 'border-color: rgba(244,63,94,0.35)' : '';

            return `
                <div class="tarjeta p-4" style="${borde}">
                    <div class="flex justify-between items-start gap-3 mb-2.5">
                        <div class="min-w-0">
                            <p class="text-sm font-bold">${escapeHTML(f.clienteNombre || f.correo || 'Cliente sin nombre')}</p>
                            <p class="text-[11px] mt-0.5" style="color: var(--tenue)">${escapeHTML(f.producto || 'Venta fiada')} · se llevó el ${escapeHTML(fechaVenta)}</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <span class="cifra-grande text-[24px] block">$${total}</span>
                            ${totalBsNum ? `<span class="cifra text-[11px] block font-bold" style="color: var(--cyan)">Bs ${totalBsNum.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>` : ''}
                        </div>
                    </div>
                    <span class="chip chip-${estado.tono}">
                        <i class="fa-solid ${pagado ? 'fa-check' : 'fa-triangle-exclamation'}"></i> ${escapeHTML(estado.texto)}
                    </span>
                    ${f.nota ? `<p class="text-[11px] mt-2.5" style="color: var(--gris)"><i class="fa-solid fa-note-sticky mr-1.5" style="color: var(--tenue)"></i>${escapeHTML(f.nota)}</p>` : ''}
                    ${!pagado ? `
                    <button type="button" data-id="${idAttr}" onclick="marcarFiadoPagado(this.dataset.id)" class="btn-hueso w-full mt-4 py-2.5 rounded-full text-xs">
                        <i class="fa-solid fa-check mr-1.5"></i> Ya me pagó
                    </button>` : ''}
                </div>
            `;
        }
