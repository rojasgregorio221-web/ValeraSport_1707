/* Datos/fiados.js · generado por separar-capas.js · el código está igual que en admin.html */
        async function cargarResumenFiadosVencidos() {
            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: obtenerPassword(), tipo: 'fiados' })
                });
                const datos = await resp.json();
                if (!datos.ok) return;
                const fiados = datos.fiados || [];
                const vencidos = fiados.filter(f => f.estadoPago !== 'pagado' && f.fechaPago && diasEntreFechas(f.fechaPago) < 0).length;
                const badge = document.getElementById('badgeFiadosVencidos');
                if (badge) {
                    badge.textContent = String(vencidos);
                    badge.classList.toggle('hidden', vencidos === 0);
                }
            } catch (e) { /* silencioso */ }
        }

        async function cargarFiados() {
            if (peticionFiadosEnCurso) return;
            peticionFiadosEnCurso = true;
            const miId = ++idSolicitudFiados;

            const cargando = document.getElementById('cargandoFiados');
            const lista = document.getElementById('listaFiados');

            if (!lista.children.length) cargando.classList.remove('hidden');

            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: obtenerPassword(), tipo: 'fiados' })
                });
                const datos = await resp.json();
                if (miId !== idSolicitudFiados) return;

                cargando.classList.add('hidden');
                if (!datos.ok) {
                    lista.innerHTML = '<p class="aviso-error">' + escapeHTML(datos.error || 'No se pudieron cargar los fiados') + '</p>';
                    return;
                }

                listaFiadosMemoria = datos.fiados || [];
                renderizarListaFiados();
                cargarResumenFiadosVencidos();
            } catch (e) {
                if (miId !== idSolicitudFiados) return;
                cargando.classList.add('hidden');
                lista.innerHTML = '<p class="aviso-error">No se pudo conectar con el servidor.</p>';
            } finally {
                peticionFiadosEnCurso = false;
            }
        }

        async function marcarFiadoPagado(idVenta) {
            const metodoPago = prompt('¿Con qué te pagó?\n(Pago Móvil, Efectivo USD, Efectivo Bs, Punto de venta, Transferencia, Zelle, Binance):', 'Pago Móvil');
            if (metodoPago === null) return;
            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        password: obtenerPassword(),
                        accion: 'marcarFiadoPagado',
                        idVenta: idVenta,
                        metodoPago: metodoPago.trim() || 'Pago Móvil'
                    })
                });
                const datos = await resp.json();
                if (!datos.ok) { alert('No se pudo actualizar: ' + (datos.error || 'error desconocido')); return; }
                alert('✅ Fiado cobrado. Ya está sumado a las ventas del día.');
                cargarFiados();
                cargarResumenFiadosVencidos();
                cargarVentas();
            } catch (e) {
                alert('No se pudo conectar con el servidor.');
            }
        }
