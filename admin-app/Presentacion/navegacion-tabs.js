/* Presentacion/navegacion-tabs.js · generado por separar-capas.js · el código está igual que en admin.html */
        // ---------- PESTAÑAS PRINCIPALES ----------
        function cambiarTabPedidos(tab) {
            tabActiva = tab;
            document.querySelectorAll('.tab-pedidos').forEach(btn => btn.classList.toggle('activa', btn.dataset.tab === tab));
            reposicionarGlider();
            const btnActivo = document.querySelector(`.tab-pedidos[data-tab="${tab}"]`);
            if (btnActivo) {
                btnActivo.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
            document.getElementById('vistaPedidos').classList.toggle('hidden', tab !== 'pedidos');
            document.getElementById('vistaVentas').classList.toggle('hidden', tab !== 'ventas');
            document.getElementById('vistaFiados').classList.toggle('hidden', tab !== 'fiados');
            document.getElementById('vistaGastos').classList.toggle('hidden', tab !== 'gastos');
            document.getElementById('btnRechazarTodos').classList.toggle('hidden', tab !== 'pedidos' || subtabPedidosActiva !== 'pendientes');
            if (tab === 'ventas') cargarVentas();
            if (tab === 'fiados') cargarFiados();
            if (tab === 'gastos') cargarGastos();
            if (tab === 'pedidos') cargarSubtabPedidosActiva();
        }

        // ---------- SUBPESTAÑAS: PENDIENTES / ACEPTADAS / RECHAZADAS ----------
        function cambiarSubtabPedidos(subtab) {
            subtabPedidosActiva = subtab;
            document.querySelectorAll('.subtab-pedidos').forEach(btn => btn.classList.toggle('activa', btn.dataset.subtab === subtab));
            document.getElementById('vistaPendientes').classList.toggle('hidden', subtab !== 'pendientes');
            document.getElementById('vistaAceptadas').classList.toggle('hidden', subtab !== 'aceptadas');
            document.getElementById('vistaRechazadas').classList.toggle('hidden', subtab !== 'rechazadas');
            document.getElementById('btnRechazarTodos').classList.toggle('hidden', subtab !== 'pendientes');
            cargarSubtabPedidosActiva();
        }

        function cargarSubtabPedidosActiva() {
            if (subtabPedidosActiva === 'aceptadas') cargarAceptadas();
            if (subtabPedidosActiva === 'rechazadas') cargarRechazadas();
            if (subtabPedidosActiva === 'pendientes') cargarPedidos();
        }

        // ---------- ACORDEÓN DE TARJETAS DE ORDEN ----------
        function inicializarAcordeonesOrdenes() {
            ['listaPedidos', 'listaAceptadas', 'listaRechazadas'].forEach(id => {
                const contenedor = document.getElementById(id);
                if (!contenedor || contenedor.dataset.acordeonListo) return;
                contenedor.dataset.acordeonListo = '1';
                contenedor.addEventListener('click', (e) => {
                    const cabecera = e.target.closest('[data-toggle-orden]');
                    if (!cabecera) return;
                    const tarjeta = cabecera.closest('[data-idorden]');
                    if (!tarjeta) return;
                    const detalle = tarjeta.querySelector('.detalle-orden');
                    const icono = cabecera.querySelector('.icono-acordeon');
                    if (!detalle) return;
                    const estabaAbierta = detalle.classList.contains('abierta');

                    contenedor.querySelectorAll('.detalle-orden.abierta').forEach(d => d.classList.remove('abierta'));
                    contenedor.querySelectorAll('.icono-acordeon.rotado').forEach(ic => ic.classList.remove('rotado'));

                    if (!estabaAbierta) {
                        detalle.classList.add('abierta');
                        if (icono) icono.classList.add('rotado');
                    }
                });
            });
        }

        function refrescarManual() {
            const icono = document.getElementById('iconoRefrescar');
            if (icono) { icono.classList.add('fa-spin'); setTimeout(() => icono.classList.remove('fa-spin'), 600); }
            cargarTodo();
        }
