/* Negocio/carrito.js · generado por separar-capas.js · el código está igual que en admin.html */
        // ===================================================================
        // VENTA EN TIENDA: SUMAR / RESTAR / DESCUENTO AL MAYOR / PRECIO EN LÍNEA
        // ===================================================================
        function contarTotalPiezasFisica() {
            return carritoFisica.reduce((total, item) => total + (parseInt(item.cantidad, 10) || 1), 0);
        }

        function calcularResumenCarritoFisica() {
            const totalPiezas = contarTotalPiezasFisica();

            // Si bajó de 3 prendas, la decisión del descuento se pregunta de nuevo
            if (totalPiezas < 3) {
                aplicarDescuentoMayor = null;
            }

            const esCandidatoDescuento = totalPiezas >= 3;
            // Solo aplica descuento si se eligió explícitamente aplicarlo
            const hayDescuento = esCandidatoDescuento && (aplicarDescuentoMayor === true);
            let subtotal = 0;
            let total = 0;

            carritoFisica.forEach(item => {
                const cant = parseInt(item.cantidad, 10) || 1;
                const precioOrig = parseFloat(item.precio) || 0;
                const precioFinalUnit = hayDescuento ? Math.max(0, precioOrig - 1) : precioOrig;
                subtotal += precioOrig * cant;
                total += precioFinalUnit * cant;
            });

            return {
                totalPiezas,
                subtotal,
                total,
                descuentoTotal: subtotal - total,
                esCandidatoDescuento,
                hayDescuento
            };
        }

        function setAplicarDescuento(aplicar) {
            aplicarDescuentoMayor = Boolean(aplicar);
            renderizarCarritoFisica();
            actualizarMiniStepperScanner();
        }

        function toggleDescuentoMayor() {
            aplicarDescuentoMayor = !aplicarDescuentoMayor;
            renderizarCarritoFisica();
            actualizarMiniStepperScanner();
        }

        // Edición de precio directa en la línea (sin ventana emergente).
        function actualizarPrecioItemFisica(indice, valorTexto, inputEl) {
            if (!carritoFisica[indice]) return;
            const limpio = String(valorTexto).replace(',', '.').trim();
            const nuevoPrecio = parseFloat(limpio);
            if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
                renderizarCarritoFisica(); // vuelve al valor válido anterior
                return;
            }
            carritoFisica[indice].precio = Math.min(nuevoPrecio, 9999);
            renderizarCarritoFisica();
            actualizarMiniStepperScanner();
        }

        function agregarItemCarritoFisica(itemDirecto) {
            let item = itemDirecto;

            if (!item) {
                const producto = document.getElementById('fisicaProducto').value.trim();
                const precio = parseFloat(document.getElementById('fisicaPrecio').value);
                const categoria = document.getElementById('fisicaCategoria').value.trim();
                const mensaje = document.getElementById('mensajeFisica');

                if (!producto || isNaN(precio) || precio <= 0) {
                    mensaje.textContent = 'Escribe el nombre de la prenda y un precio mayor que cero.';
                    mensaje.className = 'msg msg-error';
                    return;
                }
                item = { producto, precio, categoria, cantidad: 1 };

                document.getElementById('fisicaProducto').value = '';
                document.getElementById('fisicaPrecio').value = '';
                document.getElementById('fisicaCategoria').value = '';
                actualizarPrecioBsFisica();
                mensaje.classList.add('hidden');
            }

            const indexExistente = carritoFisica.findIndex(p => p.producto.toLowerCase() === item.producto.toLowerCase());
            if (indexExistente !== -1) {
                carritoFisica[indexExistente].cantidad += (item.cantidad || 1);
                ultimoIndiceEscaneado = indexExistente;
            } else {
                carritoFisica.push({
                    producto: item.producto,
                    precio: item.precio,
                    categoria: item.categoria || '',
                    cantidad: item.cantidad || 1,
                    codigo: item.codigo || ''
                });
                ultimoIndiceEscaneado = carritoFisica.length - 1;
            }

            renderizarCarritoFisica();
            actualizarMiniStepperScanner();
        }

        function modificarCantidadItem(indice, delta) {
            if (!carritoFisica[indice]) return;
            const nuevaCantidad = carritoFisica[indice].cantidad + delta;
            if (nuevaCantidad <= 0) {
                carritoFisica.splice(indice, 1);
                if (ultimoIndiceEscaneado === indice) ultimoIndiceEscaneado = -1;
            } else {
                carritoFisica[indice].cantidad = nuevaCantidad;
            }
            renderizarCarritoFisica();
            actualizarMiniStepperScanner();
        }

        function quitarItemCarritoFisica(indice) {
            carritoFisica.splice(indice, 1);
            if (ultimoIndiceEscaneado === indice) ultimoIndiceEscaneado = -1;
            renderizarCarritoFisica();
            actualizarMiniStepperScanner();
        }

        function vaciarCarritoFisica() {
            if (!carritoFisica.length) return;
            if (!confirm('¿Quitar todas las prendas de esta venta?')) return;
            carritoFisica = [];
            aplicarDescuentoMayor = null;
            ultimoIndiceEscaneado = -1;
            renderizarCarritoFisica();
            actualizarMiniStepperScanner();
        }

        function modificarCantidadUltimoEscaneado(delta) {
            if (ultimoIndiceEscaneado >= 0 && ultimoIndiceEscaneado < carritoFisica.length) {
                modificarCantidadItem(ultimoIndiceEscaneado, delta);
            }
        }
