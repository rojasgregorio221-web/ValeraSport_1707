/* Presentacion/venta-vista.js · generado por separar-capas.js · el código está igual que en admin.html */
        // ===================================================================
        // FIADO: QUIÉN DEBE, CUÁNTO Y DESDE CUÁNDO
        // ===================================================================
        function alCambiarMetodoPagoFisica() {
            setTimeout(function () { try { vvCambioMetodo(); } catch (e) { console.error(e); } }, 0);
            const metodo = document.getElementById('fisicaMetodoPago').value;
            const campos = document.getElementById('camposFiadoFisica');
            campos.classList.toggle('hidden', metodo !== 'Fiado');
        }

        function poblarDatalistProductos() {
            const datalist = document.getElementById('listaProductosFisica');
            if (!datalist) return;
            datalist.innerHTML = productosCatalogo
                .map(p => (p.producto || p.nombre || '').trim())
                .filter(Boolean)
                .map(nombre => `<option value="${escapeHTML(nombre)}"></option>`)
                .join('');
        }

        function buscarProductoEscrito() {
            const valor = document.getElementById('fisicaProducto').value.trim().toLowerCase();
            if (!valor) return;
            const coincidencia = productosCatalogo.find(p => (p.producto || p.nombre || '').toLowerCase().trim() === valor);
            if (coincidencia) aplicarCoincidenciaProducto(coincidencia, false);
        }

        function aplicarCoincidenciaProducto(coincidencia, avisar) {
            document.getElementById('fisicaProducto').value = coincidencia.producto || coincidencia.nombre || '';
            document.getElementById('fisicaPrecio').value = coincidencia.precio ? parseFloat(coincidencia.precio).toFixed(2) : '';
            document.getElementById('fisicaCategoria').value = normalizarCategoria(coincidencia.categoria);
            actualizarPrecioBsFisica();
            if (avisar) {
                const mensaje = document.getElementById('mensajeFisica');
                mensaje.textContent = 'Prenda encontrada. Toca "Sumar esta prenda a la venta".';
                mensaje.className = 'msg msg-ok';
            }
        }

        function actualizarPrecioBsFisica() {
            const input = document.getElementById('fisicaPrecio');
            const el = document.getElementById('fisicaPrecioBs');
            if (!el) return;
            let precio = parseFloat(input.value);
            if (precio > 9999) { precio = 9999; input.value = '9999'; }
            if (!tasaBcvAdmin || !precio) { el.textContent = ''; return; }
            el.textContent = 'Bs ' + (precio * tasaBcvAdmin).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
