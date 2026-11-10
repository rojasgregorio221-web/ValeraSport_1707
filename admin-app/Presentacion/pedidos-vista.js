/* Presentacion/pedidos-vista.js · generado por separar-capas.js · el código está igual que en admin.html */
        function renderizarPedidos(ordenes) {
            const cargando = document.getElementById('cargando');
            const lista = document.getElementById('listaPedidos');
            const sinPedidos = document.getElementById('sinPedidos');

            cargando.classList.add('hidden');

            if (!ordenes || !ordenes.length) {
                lista.innerHTML = '';
                sinPedidos.classList.remove('hidden');
                actualizarBadgesPedidos(0);
                return;
            }

            sinPedidos.classList.add('hidden');
            lista.innerHTML = ordenes.map(o => tarjetaOrden(o, true)).join('');
            actualizarBadgesPedidos(ordenes.length);
        }

        function actualizarBadgesPedidos(cantidad) {
            [document.getElementById('badgePedidosPendientes'), document.getElementById('badgeSubtabPendientes')].forEach(badge => {
                if (!badge) return;
                badge.textContent = String(cantidad);
                badge.classList.toggle('hidden', cantidad === 0);
            });
        }

        // ---------- TARJETA DE PEDIDO (acordeón: cabecera siempre visible) ----------
        function tarjetaOrden(orden, conBotones, rechazada) {
            const fecha = orden.fecha ? new Date(orden.fecha).toLocaleString('es-VE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '';
            const total = Number(orden.total || 0).toFixed(2);
            const totalBsNum = orden.precioBs ? Number(orden.precioBs) : (tasaBcvAdmin ? (Number(orden.total) || 0) * tasaBcvAdmin : null);
            const idAttr = escapeHTML(orden.idOrden);
            const metodoPago = escapeHTML(orden.metodoPago || 'No especificado');
            const referencia = orden.referencia && String(orden.referencia).trim() ? escapeHTML(orden.referencia) : null;
            const telefonoPago = orden.telefonoPago && String(orden.telefonoPago).trim() ? escapeHTML(orden.telefonoPago) : null;
            const items = orden.items || [];
            const motivo = orden.motivo && String(orden.motivo).trim() ? escapeHTML(orden.motivo) : null;

            const colorEtiqueta = rechazada ? '#FDA4AF' : (conBotones ? 'var(--fucsia)' : '#6EE7B7');
            const iconoEtiqueta = rechazada ? '<i class="fa-solid fa-xmark mr-1.5"></i> ' : (conBotones ? '<i class="fa-regular fa-clock mr-1.5"></i> ' : '<i class="fa-solid fa-check mr-1.5"></i> ');

            const listaItems = items.map(it => {
                const itPrecio = Number(it.precio || 0);
                const itBs = tasaBcvAdmin ? (itPrecio * tasaBcvAdmin).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;
                return `
                    <div class="flex justify-between items-center gap-3 text-sm py-2" style="border-bottom: 1px solid var(--linea)">
                        <div class="min-w-0">
                            <span>${escapeHTML(it.producto)}</span>
                            <span class="text-[10px] uppercase tracking-wide ml-2" style="color: var(--tenue)">${escapeHTML(it.categoria || 'Variados')}</span>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <span class="cifra text-xs font-bold">$${itPrecio.toFixed(2)}</span>
                            ${itBs ? `<span class="cifra text-[10px] block" style="color: var(--tenue)">Bs ${itBs}</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="tarjeta overflow-hidden" id="orden-${idAttr}" data-idorden="${idAttr}">
                    <button type="button" data-toggle-orden="${idAttr}" class="w-full flex justify-between items-start gap-3 p-5 text-left">
                        <div class="min-w-0">
                            <span class="text-[10px] font-bold uppercase tracking-[0.16em] block mb-1.5" style="color: ${colorEtiqueta}">
                                ${iconoEtiqueta}${orden.numeroOrden ? 'Pedido #' + escapeHTML(String(orden.numeroOrden)) + ' · ' : ''}${items.length} ${items.length === 1 ? 'prenda' : 'prendas'}
                            </span>
                            <p class="text-xs" style="color: var(--tenue)">${escapeHTML(fecha)}</p>
                        </div>
                        <div class="flex items-center gap-3 flex-shrink-0">
                            <div class="text-right">
                                <span class="cifra-grande text-[26px] block">$${total}</span>
                                ${totalBsNum ? `<span class="cifra text-[11px] block font-bold" style="color: var(--cyan)">Bs ${totalBsNum.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>` : ''}
                            </div>
                            <i class="fa-solid fa-chevron-down text-xs icono-acordeon" style="color: var(--tenue)"></i>
                        </div>
                    </button>

                    <div class="detalle-orden">
                        <div class="px-5 pb-5">
                            <div class="sub-panel px-4 py-1 mb-3">${listaItems}</div>

                            <div class="sub-panel px-4 py-3.5 ${conBotones ? 'mb-4' : ''}">
                                <div class="flex justify-between items-center text-xs">
                                    <span class="uppercase font-bold tracking-wide" style="color: var(--tenue)">Pagó con</span>
                                    <span class="font-semibold">${metodoPago}</span>
                                </div>
                                ${referencia ? `
                                <div class="flex justify-between items-center text-xs mt-2.5">
                                    <span class="uppercase font-bold tracking-wide" style="color: var(--tenue)">Referencia</span>
                                    <span class="cifra font-semibold">${referencia}</span>
                                </div>` : ''}
                                ${telefonoPago ? `
                                <div class="flex justify-between items-center text-xs mt-2.5">
                                    <span class="uppercase font-bold tracking-wide" style="color: var(--tenue)">Teléfono</span>
                                    <a href="https://wa.me/58${telefonoPago.replace(/\D/g, '').replace(/^0/, '')}" target="_blank" rel="noopener noreferrer" class="cifra font-semibold" style="color: var(--cyan)">
                                        ${telefonoPago} <i class="fa-brands fa-whatsapp ml-1"></i>
                                    </a>
                                </div>` : ''}
                            </div>

                            ${motivo ? `
                            <div class="mt-3 rounded-2xl px-4 py-3 text-xs txt-danger" style="background: rgba(244,63,94,0.10); border: 1px solid rgba(244,63,94,0.25)">
                                <span class="font-bold uppercase tracking-wide block mb-1">Por qué se rechazó</span>
                                ${motivo}
                            </div>` : ''}

                            ${conBotones ? `
                            <div class="grid grid-cols-2 gap-3">
                                <button data-accion="rechazarOrden" class="btn-fantasma py-3 rounded-full text-sm">
                                    <i class="fa-solid fa-xmark mr-1.5"></i> Rechazar
                                </button>
                                <button data-accion="aceptarOrden" class="btn-marca py-3 rounded-full text-sm">
                                    <i class="fa-solid fa-check mr-1.5"></i> Aceptar
                                </button>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
