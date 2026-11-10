/* Negocio/venta-fisica.js · generado por separar-capas.js · el código está igual que en admin.html */
        // ===================================================================
        // GUARDAR LA VENTA EN TIENDA (se ve al instante y se envía en segundo plano)
        // ===================================================================
        async function registrarVentaFisica() {
            const correo = document.getElementById('fisicaCorreo').value.trim();
            const metodoPago = document.getElementById('fisicaMetodoPago').value;
            const nota = document.getElementById('fisicaNota').value.trim();
            const mensaje = document.getElementById('mensajeFisica');
            const boton = document.getElementById('btnRegistrarVentaFisica');
            const textoBoton = document.getElementById('textoRegistrarVentaFisica');

            const esFiado = metodoPago === 'Fiado';
            const fiadoNombreCliente = esFiado ? document.getElementById('fiadoNombreCliente').value.trim() : '';
            const fiadoFechaPago = esFiado ? document.getElementById('fiadoFechaPago').value : '';

            mensaje.classList.add('hidden');

            if (esFiado && (!fiadoNombreCliente || !fiadoFechaPago)) {
                mensaje.textContent = 'Para fiado hace falta el nombre del cliente y la fecha en que va a pagar.';
                mensaje.className = 'msg msg-error';
                return;
            }

            // Si quedó algo escrito a mano sin agregar, se agrega
            const productoSuelto = document.getElementById('fisicaProducto').value.trim();
            const precioSuelto = parseFloat(document.getElementById('fisicaPrecio').value);
            if (productoSuelto && !isNaN(precioSuelto) && precioSuelto > 0) {
                agregarItemCarritoFisica();
            }

            if (!carritoFisica.length) {
                mensaje.textContent = 'Escanea o agrega al menos una prenda antes de guardar.';
                mensaje.className = 'msg msg-error';
                return;
            }

            if (carritoFisica.length && contarTotalPiezasFisica() >= 3 && aplicarDescuentoMayor === null) {
                const quiereDescuento = confirm(
                    `Llevan ${contarTotalPiezasFisica()} prendas en esta venta.\n\n` +
                    `¿Les aplicas el precio al mayor de $1.00 menos por prenda?\n\n` +
                    `• Aceptar = sí, -$1.00 por prenda\n` +
                    `• Cancelar = no, precio normal`
                );
                aplicarDescuentoMayor = quiereDescuento;
                renderizarCarritoFisica();
            }

            const resumen = calcularResumenCarritoFisica();

            const itemsAEnviar = carritoFisica.map(item => {
                const precioUnitarioFinal = resumen.hayDescuento ? Math.max(0, item.precio - 1) : item.precio;
                return {
                    nombre: item.producto,
                    producto: item.producto,
                    precio: precioUnitarioFinal.toFixed(2),
                    precioUnitario: precioUnitarioFinal.toFixed(2),
                    precioOriginal: item.precio.toFixed(2),
                    precioBs: tasaBcvAdmin ? (precioUnitarioFinal * tasaBcvAdmin).toFixed(2) : '',
                    categoria: item.categoria || '',
                    cantidad: item.cantidad,
                    descontado: resumen.hayDescuento
                };
            });

            const notaFinal = resumen.hayDescuento
                ? (nota ? nota + ' (incluye descuento 3+ piezas)' : 'Descuento por 3+ piezas')
                : nota;

            const nombrePrincipal = itemsAEnviar.map(i => i.nombre + (i.cantidad > 1 ? ' (x' + i.cantidad + ')' : '')).join(', ');

            const vvTextoNota = (function () { try { return vvTextoVuelto(); } catch (e) { return ''; } })();

            // Se muestra el resultado de una vez y se limpia el formulario
            const totalBsTexto = tasaBcvAdmin ? ' (Bs ' + (resumen.total * tasaBcvAdmin).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ')' : '';
            mensaje.textContent = esFiado
                ? `✅ Fiado anotado: ${resumen.totalPiezas} ${resumen.totalPiezas === 1 ? 'prenda' : 'prendas'} por $${resumen.total.toFixed(2)}${totalBsTexto}. Queda en Fiado, todavía no suma a la caja.`
                : `✅ Venta guardada: ${resumen.totalPiezas} ${resumen.totalPiezas === 1 ? 'prenda' : 'prendas'} por $${resumen.total.toFixed(2)}${totalBsTexto}.`;
            mensaje.className = 'msg msg-ok';

            carritoFisica = [];
            aplicarDescuentoMayor = null;
            ultimoIndiceEscaneado = -1;
            renderizarCarritoFisica();
            try { vvLimpiar(true); } catch (err) { console.error(err); }
            document.getElementById('fisicaCorreo').value = '';
            document.getElementById('fisicaNota').value = '';
            document.getElementById('fisicaProducto').value = '';
            document.getElementById('fisicaPrecio').value = '';
            document.getElementById('fisicaCategoria').value = '';
            if (esFiado) {
                document.getElementById('fiadoNombreCliente').value = '';
                document.getElementById('fisicaMetodoPago').value = 'Pago Móvil';
                alCambiarMetodoPagoFisica();
            }

            textoBoton.innerHTML = '<i class="fa-solid fa-check mr-1.5"></i> ' + (esFiado ? 'Fiado anotado' : 'Venta guardada');
            setTimeout(() => {
                textoBoton.textContent = 'Guardar la venta';
            }, 2500);

            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        password: obtenerPassword(),
                        accion: 'ventaFisica',
                        nombre: nombrePrincipal,
                        precio: resumen.total.toFixed(2),
                        categoria: itemsAEnviar[0]?.categoria || '',
                        items: itemsAEnviar,
                        metodoPago: metodoPago,
                        correoCliente: correo,
                        nota: [notaFinal, vvTextoNota].filter(Boolean).join(' · '),
                        esFiado: esFiado,
                        clienteNombre: fiadoNombreCliente,
                        fechaPago: fiadoFechaPago,
                        estadoPago: esFiado ? 'pendiente' : ''
                    })
                });
                const datos = await resp.json();

                if (datos.ok) {
                    cargarVentas();
                    if (esFiado) { cargarFiados(); cargarResumenFiadosVencidos(); }
                } else {
                    throw new Error(datos.error || 'Error al procesar en servidor');
                }
            } catch (e) {
                console.error("Error al registrar venta en segundo plano:", e);
                mensaje.textContent = '⚠️ La venta se ve en pantalla, pero no se pudo guardar en red. Revisa la conexión.';
                mensaje.className = 'msg msg-warn';
            }
        }
