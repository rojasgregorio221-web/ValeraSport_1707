/* Datos/pedidos.js · generado por separar-capas.js · el código está igual que en admin.html */
        async function cargarPedidos() {
            if (peticionPedidosEnCurso) return;
            peticionPedidosEnCurso = true;
            const miId = ++idSolicitudPedidos;
            const cargando = document.getElementById('cargando');
            const lista = document.getElementById('listaPedidos');
            const sinPedidos = document.getElementById('sinPedidos');

            if (!lista.children.length) cargando.classList.remove('hidden');

            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: obtenerPassword(), tipo: 'pedidos' })
                });
                const datos = await resp.json();
                if (miId !== idSolicitudPedidos) return;

                cargando.classList.add('hidden');
                sinPedidos.classList.add('hidden');

                if (!datos.ok) {
                    lista.innerHTML = '<p class="aviso-error">' + escapeHTML(datos.error || 'No se pudieron cargar los pedidos') + '</p>';
                    return;
                }

                const ordenes = datos.ordenes || [];
                renderizarPedidos(ordenes);
                guardarCache({ pedidos: ordenes });
            } catch (e) {
                if (miId !== idSolicitudPedidos) return;
                cargando.classList.add('hidden');
                lista.innerHTML = '<p class="aviso-error">No se pudo conectar con el servidor.</p>';
            } finally {
                peticionPedidosEnCurso = false;
            }
        }

        async function cargarAceptadas() {
            if (peticionAceptadasEnCurso) return;
            peticionAceptadasEnCurso = true;
            const miId = ++idSolicitudAceptadas;
            const cargando = document.getElementById('cargandoAceptadas');
            const lista = document.getElementById('listaAceptadas');
            const sinAceptadas = document.getElementById('sinAceptadas');

            if (!lista.children.length) cargando.classList.remove('hidden');

            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: obtenerPassword(), tipo: 'aceptados' })
                });
                const datos = await resp.json();
                if (miId !== idSolicitudAceptadas) return;

                cargando.classList.add('hidden');
                sinAceptadas.classList.add('hidden');

                if (!datos.ok) {
                    lista.innerHTML = '<p class="aviso-error">' + escapeHTML(datos.error || 'No se pudieron cargar los pedidos') + '</p>';
                    return;
                }

                const ordenes = datos.ordenes || [];
                if (!ordenes.length) {
                    lista.innerHTML = '';
                    sinAceptadas.classList.remove('hidden');
                    return;
                }

                lista.innerHTML = ordenes.map(o => tarjetaOrden(o, false)).join('');
            } catch (e) {
                if (miId !== idSolicitudAceptadas) return;
                cargando.classList.add('hidden');
                lista.innerHTML = '<p class="aviso-error">No se pudo conectar con el servidor.</p>';
            } finally {
                peticionAceptadasEnCurso = false;
            }
        }

        async function cargarRechazadas() {
            if (peticionRechazadasEnCurso) return;
            peticionRechazadasEnCurso = true;
            const miId = ++idSolicitudRechazadas;
            const cargando = document.getElementById('cargandoRechazadas');
            const lista = document.getElementById('listaRechazadas');
            const sinRechazadas = document.getElementById('sinRechazadas');

            if (!lista.children.length) cargando.classList.remove('hidden');

            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: obtenerPassword(), tipo: 'rechazadas' })
                });
                const datos = await resp.json();
                if (miId !== idSolicitudRechazadas) return;

                cargando.classList.add('hidden');
                sinRechazadas.classList.add('hidden');

                if (!datos.ok) {
                    lista.innerHTML = '<p class="aviso-error">' + escapeHTML(datos.error || 'No se pudieron cargar los pedidos') + '</p>';
                    return;
                }

                const ordenes = datos.ordenes || [];
                if (!ordenes.length) {
                    lista.innerHTML = '';
                    sinRechazadas.classList.remove('hidden');
                    return;
                }

                lista.innerHTML = ordenes.map(o => tarjetaOrden(o, false, true)).join('');
            } catch (e) {
                if (miId !== idSolicitudRechazadas) return;
                cargando.classList.add('hidden');
                lista.innerHTML = '<p class="aviso-error">No se pudo conectar con el servidor.</p>';
            } finally {
                peticionRechazadasEnCurso = false;
            }
        }

        async function responderOrden(idOrden, accion, motivo) {
            const tarjeta = document.querySelector(`#listaPedidos [data-idorden="${CSS.escape(idOrden)}"]`);
            if (tarjeta) tarjeta.style.opacity = '0.4';

            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: obtenerPassword(), accion, idOrden, motivo: motivo || '' })
                });
                const datos = await resp.json();

                if (!datos.ok) {
                    alert('No se pudo procesar el pedido: ' + (datos.error || 'error desconocido'));
                    if (tarjeta) tarjeta.style.opacity = '1';
                    return;
                }

                if (tarjeta) tarjeta.remove();
                cargarVentas();

                const lista = document.getElementById('listaPedidos');
                if (!lista.children.length) {
                    document.getElementById('sinPedidos').classList.remove('hidden');
                }
                actualizarBadgesPedidos(lista.children.length);
                if (accion === 'aceptarOrden' && tabActiva === 'pedidos' && subtabPedidosActiva === 'aceptadas') cargarAceptadas();
            } catch (e) {
                alert('No se pudo conectar con el servidor.');
                if (tarjeta) tarjeta.style.opacity = '1';
            }
        }

        async function rechazarTodosPendientes() {
            const confirmar = confirm('¿Rechazar todos los pedidos que están por revisar? El stock reservado se devuelve solo.');
            if (!confirmar) return;

            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: obtenerPassword(), accion: 'rechazar_todos' })
                });
                const datos = await resp.json();
                if (!datos.ok) { alert('No se pudo procesar: ' + (datos.error || 'error desconocido')); return; }
                cargarTodo();
            } catch (e) {
                alert('No se pudo conectar con el servidor.');
            }
        }
