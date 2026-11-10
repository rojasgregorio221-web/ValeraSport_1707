/* Datos/ventas.js · generado por separar-capas.js · el código está igual que en admin.html */
        async function cargarVentas() {
            if (peticionVentasEnCurso) return;
            peticionVentasEnCurso = true;
            const miId = ++idSolicitudVentas;

            const cargando = document.getElementById('cargandoVentas');
            const lista = document.getElementById('listaVentas');
            const sinVentas = document.getElementById('sinVentas');

            if (tabActiva === 'ventas' && !lista.children.length) cargando.classList.remove('hidden');

            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: obtenerPassword(), tipo: 'ventas' })
                });
                const datos = await resp.json();
                if (miId !== idSolicitudVentas) return;

                cargando.classList.add('hidden');
                if (!datos.ok) {
                    if (tabActiva === 'ventas') lista.innerHTML = '<p class="aviso-error">' + escapeHTML(datos.error || 'No se pudieron cargar las ventas') + '</p>';
                    return;
                }

                listaVentasMemoria = datos.ventas || [];
                renderizarListaVentas();
                renderizarHeroVendidoHoy();
            } catch (e) {
                if (miId !== idSolicitudVentas) return;
                cargando.classList.add('hidden');
                if (tabActiva === 'ventas') lista.innerHTML = '<p class="aviso-error">No se pudo conectar con el servidor.</p>';
            } finally {
                peticionVentasEnCurso = false;
            }
        }

        async function vaciarTodasLasVentasAdmin() {
            const primerPaso = confirm('¿Vaciar la hoja de ventas?\n\nTranquilo: se crea sola una hoja de respaldo con la fecha de hoy, por si necesitas verlas después.');
            if (!primerPaso) return;

            const confirmacion = prompt('Para confirmar, escribe la palabra BORRAR en mayúsculas:');
            if (confirmacion !== 'BORRAR') {
                alert('Listo, no se borró nada.');
                return;
            }

            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: obtenerPassword(), accion: 'vaciarVentas' })
                });
                const datos = await resp.json();
                if (datos.ok) {
                    alert('✅ ' + (datos.mensaje || 'Ventas vaciadas y respaldadas.'));
                    cargarTodo();
                } else {
                    alert('No se pudo vaciar: ' + (datos.error || 'error desconocido'));
                }
            } catch (e) {
                alert('No se pudo conectar con el servidor.');
            }
        }
