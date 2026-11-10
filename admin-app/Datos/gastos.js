/* Datos/gastos.js · generado por separar-capas.js · el código está igual que en admin.html */
        async function cargarGastos() {
            if (peticionGastosEnCurso) return;
            peticionGastosEnCurso = true;
            const miId = ++idSolicitudGastos;

            const cargando = document.getElementById('cargandoGastos');
            const lista = document.getElementById('listaGastos');

            if (!lista.children.length) cargando.classList.remove('hidden');

            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: obtenerPassword(), tipo: 'gastos' })
                });
                const datos = await resp.json();
                if (miId !== idSolicitudGastos) return;

                cargando.classList.add('hidden');
                if (!datos.ok) {
                    lista.innerHTML = '<p class="aviso-error">' + escapeHTML(datos.error || 'No se pudieron cargar los gastos') + '</p>';
                    return;
                }

                listaGastosMemoria = datos.gastos || [];
                renderizarListaGastos();
            } catch (e) {
                if (miId !== idSolicitudGastos) return;
                cargando.classList.add('hidden');
                lista.innerHTML = '<p class="aviso-error">No se pudo conectar con el servidor.</p>';
            } finally {
                peticionGastosEnCurso = false;
            }
        }

        async function registrarGasto() {
            const concepto = document.getElementById('gastoConcepto').value.trim();
            const monto = parseFloat(document.getElementById('gastoMonto').value);
            const categoria = document.getElementById('gastoCategoria').value;
            const fecha = document.getElementById('gastoFecha').value || new Date().toISOString().slice(0, 10);
            const nota = document.getElementById('gastoNota').value.trim();
            const mensaje = document.getElementById('mensajeGasto');

            mensaje.classList.add('hidden');

            if (!concepto || isNaN(monto) || monto <= 0) {
                mensaje.textContent = 'Escribe en qué se gastó y un monto mayor que cero.';
                mensaje.className = 'msg msg-error';
                return;
            }

            // Se muestra al instante y luego se guarda en red
            const gastoLocal = { concepto, monto, categoria, fecha, nota, idGasto: 'temp-' + Date.now() };
            listaGastosMemoria.push(gastoLocal);
            renderizarListaGastos();

            document.getElementById('gastoConcepto').value = '';
            document.getElementById('gastoMonto').value = '';
            document.getElementById('gastoNota').value = '';
            mensaje.textContent = '✅ Gasto anotado.';
            mensaje.className = 'msg msg-ok';

            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: obtenerPassword(), accion: 'agregarGasto', concepto, monto: monto.toFixed(2), categoria, fecha, nota })
                });
                const datos = await resp.json();
                if (datos.ok) {
                    cargarGastos();
                } else {
                    throw new Error(datos.error || 'Error al procesar en servidor');
                }
            } catch (e) {
                console.error('Error al registrar gasto:', e);
                mensaje.textContent = '⚠️ Se anotó en pantalla, pero no se pudo guardar en red. Revisa la conexión.';
                mensaje.className = 'msg msg-warn';
            }
        }

        async function eliminarGasto(idGasto) {
            if (!confirm('¿Borrar este gasto?')) return;
            const respaldo = listaGastosMemoria;
            listaGastosMemoria = listaGastosMemoria.filter(g => (g.idGasto || g.id) !== idGasto);
            renderizarListaGastos();
            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: obtenerPassword(), accion: 'eliminarGasto', idGasto })
                });
                const datos = await resp.json();
                if (!datos.ok) throw new Error(datos.error || 'No se pudo eliminar');
            } catch (e) {
                alert('No se pudo borrar el gasto en el servidor. Se vuelve a mostrar en la lista.');
                listaGastosMemoria = respaldo;
                renderizarListaGastos();
            }
        }
