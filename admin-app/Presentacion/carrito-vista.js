/* Presentacion/carrito-vista.js · generado por separar-capas.js · el código está igual que en admin.html */
        function manejarEnterPrecioItem(event, indice) {
            if (event.key === 'Enter') {
                event.target.blur();
            }
        }

        function editarPrecioItemFisica(indice) {
            if (!carritoFisica[indice]) return;
            const input = document.querySelector(`.precio-editable-input[data-indice="${indice}"]`);
            if (input) { input.focus(); input.select(); }
        }

        function actualizarMiniStepperScanner() {
            const contenedor = document.getElementById('scannerUltimoItem');
            const cantEl = document.getElementById('scannerUltimoCant');
            const nomEl = document.getElementById('scannerUltimoNombre');
            const detEl = document.getElementById('scannerUltimoDetalle');

            if (ultimoIndiceEscaneado >= 0 && ultimoIndiceEscaneado < carritoFisica.length) {
                const it = carritoFisica[ultimoIndiceEscaneado];
                nomEl.textContent = it.producto;
                const bsUnit = tasaBcvAdmin ? ' · Bs ' + (it.precio * tasaBcvAdmin).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
                detEl.textContent = `$${it.precio.toFixed(2)} c/u${bsUnit}`;
                cantEl.textContent = it.cantidad;
                contenedor.classList.remove('hidden');
            } else {
                contenedor.classList.add('hidden');
            }

            const resumen = calcularResumenCarritoFisica();
            const contador = document.getElementById('scannerVentaContador');
            const totalMini = document.getElementById('scannerVentaTotalMini');
            const totalMiniBs = document.getElementById('scannerVentaTotalMiniBs');
            if (contador) contador.textContent = String(resumen.totalPiezas);
            if (totalMini) totalMini.textContent = '$' + resumen.total.toFixed(2);
            if (totalMiniBs) {
                if (tasaBcvAdmin && resumen.total > 0) {
                    totalMiniBs.textContent = 'Bs ' + (resumen.total * tasaBcvAdmin).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                } else {
                    totalMiniBs.textContent = '';
                }
            }
        }

        function renderizarCarritoFisica() {
            setTimeout(function () { try { vvCalcular(); } catch (e) { console.error(e); } }, 0);
            const contenedor = document.getElementById('carritoFisicaContenedor');
            const lista = document.getElementById('carritoFisicaLista');
            const cantidadEl = document.getElementById('carritoFisicaCantidad');
            const cantidadSubEl = document.getElementById('carritoFisicaCantidadSub');
            const bloquePreguntaDescuento = document.getElementById('carritoFisicaPreguntaDescuento');
            const lineaDescuento = document.getElementById('carritoFisicaLineaDescuento');
            const subtotalEl = document.getElementById('carritoFisicaSubtotal');
            const subtotalBsEl = document.getElementById('carritoFisicaSubtotalBs');
            const descuentoMontoEl = document.getElementById('carritoFisicaDescuentoMonto');
            const descuentoBsEl = document.getElementById('carritoFisicaDescuentoBs');
            const totalEl = document.getElementById('carritoFisicaTotal');
            const totalBsEl = document.getElementById('carritoFisicaTotalBs');
            const tasaInfoEl = document.getElementById('carritoFisicaTasaInfo');

            const resumen = calcularResumenCarritoFisica();

            if (!carritoFisica.length) {
                contenedor.classList.add('hidden');
                lista.innerHTML = '';
                if (bloquePreguntaDescuento) {
                    bloquePreguntaDescuento.classList.add('hidden');
                    bloquePreguntaDescuento.innerHTML = '';
                }
                actualizarMiniStepperScanner();
                return;
            }

            contenedor.classList.remove('hidden');
            cantidadEl.textContent = String(resumen.totalPiezas);
            cantidadSubEl.textContent = String(resumen.totalPiezas);
            const plSub = document.getElementById('carritoFisicaPluralSub');
            if (plSub) plSub.textContent = resumen.totalPiezas === 1 ? 'prenda' : 'prendas';
            subtotalEl.textContent = '$' + resumen.subtotal.toFixed(2);
            if (subtotalBsEl) {
                subtotalBsEl.textContent = (tasaBcvAdmin && resumen.subtotal > 0)
                    ? 'Bs ' + (resumen.subtotal * tasaBcvAdmin).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '';
            }
            totalEl.textContent = '$' + resumen.total.toFixed(2);

            if (totalBsEl) {
                if (tasaBcvAdmin && resumen.total > 0) {
                    const totalBs = resumen.total * tasaBcvAdmin;
                    totalBsEl.textContent = 'Bs ' + totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                } else {
                    totalBsEl.textContent = '';
                }
            }
            if (tasaInfoEl) {
                tasaInfoEl.textContent = tasaBcvAdmin ? 'Tasa BCV: Bs ' + tasaBcvAdmin.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + ' por dólar' : '';
            }

            // Pregunta del descuento por 3 o más piezas
            if (bloquePreguntaDescuento) {
                if (resumen.esCandidatoDescuento) {
                    bloquePreguntaDescuento.classList.remove('hidden');
                    if (aplicarDescuentoMayor === null) {
                        bloquePreguntaDescuento.innerHTML = `
                            <div class="rounded-2xl p-4 space-y-3" style="background: rgba(245,158,11,0.10); border: 1px solid rgba(245,158,11,0.32)">
                                <div class="flex items-start gap-3">
                                    <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm mt-0.5" style="background: #F59E0B; color: #16131F">
                                        <i class="fa-solid fa-tags"></i>
                                    </div>
                                    <div>
                                        <p class="text-xs font-bold">Llevan ${resumen.totalPiezas} prendas. ¿Les aplico el precio al mayor?</p>
                                        <p class="text-[11px] mt-1" style="color: var(--gris)">Baja $1.00 cada prenda, son $${resumen.totalPiezas}.00 menos en total. Tú decides.</p>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-2.5">
                                    <button type="button" onclick="setAplicarDescuento(true)" class="btn-marca py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5">
                                        <i class="fa-solid fa-check"></i> Sí, -$1 c/u
                                    </button>
                                    <button type="button" onclick="setAplicarDescuento(false)" class="btn-fantasma py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5">
                                        <i class="fa-solid fa-xmark"></i> No, precio normal
                                    </button>
                                </div>
                            </div>
                        `;
                    } else {
                        bloquePreguntaDescuento.innerHTML = `
                            <div class="flex items-center justify-between gap-3 sub-panel px-3.5 py-2.5 text-xs">
                                <span class="font-medium flex items-center gap-2" style="color: var(--gris)">
                                    <i class="fa-solid fa-tags ${aplicarDescuentoMayor ? 'txt-ok' : ''}" style="${aplicarDescuentoMayor ? '' : 'color: var(--tenue)'}"></i>
                                    Precio al mayor:
                                    <strong class="${aplicarDescuentoMayor ? 'txt-ok' : ''}" style="${aplicarDescuentoMayor ? '' : 'color: var(--hueso)'}">
                                        ${aplicarDescuentoMayor ? 'aplicado, -$1.00 c/u' : 'sin aplicar, precio normal'}
                                    </strong>
                                </span>
                                <button type="button" onclick="toggleDescuentoMayor()" class="text-[11px] font-bold" style="color: var(--cyan)">
                                    Cambiar
                                </button>
                            </div>
                        `;
                    }
                } else {
                    bloquePreguntaDescuento.classList.add('hidden');
                    bloquePreguntaDescuento.innerHTML = '';
                }
            }

            lineaDescuento.classList.toggle('hidden', !resumen.hayDescuento);
            if (resumen.hayDescuento) {
                descuentoMontoEl.textContent = '-$' + resumen.descuentoTotal.toFixed(2) + ' (' + resumen.totalPiezas + ' x $1.00)';
                if (descuentoBsEl) {
                    descuentoBsEl.textContent = tasaBcvAdmin ? '-Bs ' + (resumen.descuentoTotal * tasaBcvAdmin).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
                }
            }

            lista.innerHTML = carritoFisica.map((item, indice) => {
                const precioUnit = Number(item.precio || 0);
                const precioOrigLinea = precioUnit * item.cantidad;
                const precioFinalUnit = resumen.hayDescuento ? Math.max(0, precioUnit - 1) : precioUnit;
                const precioFinalLinea = precioFinalUnit * item.cantidad;
                const precioBsUnit = tasaBcvAdmin ? (precioUnit * tasaBcvAdmin).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;
                const precioBsFinalLinea = tasaBcvAdmin ? (precioFinalLinea * tasaBcvAdmin).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;

                return `
                    <div class="flex items-center justify-between gap-2.5 sub-panel p-3">
                        <div class="min-w-0 flex-1">
                            <p class="text-xs font-bold truncate">${escapeHTML(item.producto)}</p>
                            <div class="flex flex-wrap items-center gap-2 mt-1.5">
                                <span class="text-[10px] uppercase tracking-wide" style="color: var(--tenue)">${escapeHTML(item.categoria || 'Variados')}</span>
                                <span class="inline-flex items-center gap-1 rounded-lg pl-2 pr-1.5 py-0.5" style="background: var(--panel-alto); border: 1px solid var(--linea); color: var(--hueso)">
                                    <span class="text-[10px] cifra" style="color: var(--tenue)">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        inputmode="decimal"
                                        value="${precioUnit.toFixed(2)}"
                                        data-indice="${indice}"
                                        title="Cambiar el precio de esta prenda"
                                        onchange="actualizarPrecioItemFisica(${indice}, this.value, this)"
                                        onkeydown="manejarEnterPrecioItem(event, ${indice})"
                                        class="precio-editable-input w-14 text-xs font-bold cifra bg-transparent outline-none border-none p-0"
                                        style="color: var(--hueso)"
                                    >
                                    <span class="text-[10px]" style="color: var(--tenue)">c/u</span>
                                </span>
                                ${precioBsUnit ? `<span class="text-[10px] cifra font-medium" style="color: var(--cyan)">Bs ${precioBsUnit}</span>` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <div class="flex items-center rounded-lg" style="background: var(--panel-alto); border: 1px solid var(--linea); color: var(--hueso)">
                                <button type="button" onclick="modificarCantidadItem(${indice}, -1)" title="Restar" class="w-7 h-7 flex items-center justify-center rounded-l-lg active:scale-95 transition" style="color: var(--gris)">
                                    <i class="fa-solid fa-minus text-[10px]"></i>
                                </button>
                                <span class="w-8 text-center text-xs font-bold cifra select-none">${item.cantidad}</span>
                                <button type="button" onclick="modificarCantidadItem(${indice}, 1)" title="Sumar" class="w-7 h-7 flex items-center justify-center rounded-r-lg active:scale-95 transition" style="color: var(--cyan)">
                                    <i class="fa-solid fa-plus text-[10px]"></i>
                                </button>
                            </div>
                            <div class="text-right min-w-[68px]">
                                ${resumen.hayDescuento
                                    ? `<span class="text-[10px] line-through block cifra" style="color: var(--tenue)">$${precioOrigLinea.toFixed(2)}</span>
                                       <span class="text-xs font-bold block cifra txt-ok">$${precioFinalLinea.toFixed(2)}</span>
                                       ${precioBsFinalLinea ? `<span class="text-[10px] cifra block" style="color: rgba(110,231,183,0.7)">Bs ${precioBsFinalLinea}</span>` : ''}`
                                    : `<span class="text-xs font-bold block cifra">$${precioFinalLinea.toFixed(2)}</span>
                                       ${precioBsFinalLinea ? `<span class="text-[10px] cifra block" style="color: var(--tenue)">Bs ${precioBsFinalLinea}</span>` : ''}`}
                            </div>
                            <button type="button" onclick="quitarItemCarritoFisica(${indice})" title="Quitar" class="icon-btn w-7 h-7 flex items-center justify-center rounded-lg" style="color: var(--tenue)">
                                <i class="fa-solid fa-trash-can text-xs"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            actualizarMiniStepperScanner();
        }
