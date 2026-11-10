/* Negocio/sincronizacion.js · generado por separar-capas.js · el código está igual que en admin.html */
        async function cargarTodo() {
            // 1. Si hay datos guardados en el navegador, mostrarlos de inmediato
            try {
                const datosGuardados = sessionStorage.getItem(LLAVE_CACHE);
                if (datosGuardados) {
                    const datos = JSON.parse(datosGuardados);
                    if (datos.pedidos) renderizarPedidos(datos.pedidos);
                    if (datos.heroVendidoHoy) {
                        const t = datos.heroVendidoHoy;
                        document.getElementById('heroTotalBs').textContent = 'Bs ' + Number(t.totalBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        document.getElementById('heroTotalUsd').textContent = '$' + Number(t.totalUsd || 0).toFixed(2);
                        document.getElementById('heroPiezasBs').textContent = (t.piezasBs || 0) + ' prendas';
                        document.getElementById('heroPiezasUsd').textContent = (t.piezasUsd || 0) + ' prendas';
                    }
                }
            } catch (e) {
                // Caché corrupta o bloqueada: seguimos normal con la carga de red
            }

            // 2. Traer los datos frescos en segundo plano
            // Ventas se trae siempre (no solo en su pestaña) porque alimenta el resumen "Vendido hoy"
            try {
                const tareas = [cargarPedidos(), cargarVentas(), cargarResumenFiadosVencidos()];
                if (tabActiva === 'pedidos' && subtabPedidosActiva === 'aceptadas') tareas.push(cargarAceptadas());
                if (tabActiva === 'pedidos' && subtabPedidosActiva === 'rechazadas') tareas.push(cargarRechazadas());
                if (tabActiva === 'fiados') tareas.push(cargarFiados());
                if (tabActiva === 'gastos') tareas.push(cargarGastos());
                await Promise.all(tareas);
                marcarActualizado();
            } catch (error) {
                console.error('Error al actualizar datos en segundo plano:', error);
            }
        }
