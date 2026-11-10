/* Presentacion/panel.js · generado por separar-capas.js · el código está igual que en admin.html */
        function reposicionarGlider() {
            const glider = document.getElementById('liquidGlider');
            const contenedor = document.getElementById('contenedorTabsNav');
            if (!glider || !contenedor) return;

            const botonActivo = contenedor.querySelector(`.tab-pedidos[data-tab="${tabActiva}"]`);
            if (!botonActivo) {
                glider.classList.add('opacity-0');
                return;
            }

            const leftOffset = botonActivo.offsetLeft;
            const ancho = botonActivo.offsetWidth;

            glider.style.left = `${leftOffset}px`;
            glider.style.width = `${ancho}px`;
            glider.classList.remove('opacity-0');
        }

        function mostrarPanel() {
            pantallaLogin.classList.add('hidden');
            panelPrincipal.classList.remove('hidden');
            const hoyISO = new Date().toISOString().slice(0, 10);
            const campoFechaGasto = document.getElementById('gastoFecha');
            if (campoFechaGasto && !campoFechaGasto.value) campoFechaGasto.value = hoyISO;
            const campoFechaFiado = document.getElementById('fiadoFechaPago');
            if (campoFechaFiado && !campoFechaFiado.value) {
                const enUnaSemana = new Date();
                enUnaSemana.setDate(enUnaSemana.getDate() + 7);
                campoFechaFiado.value = enUnaSemana.toISOString().slice(0, 10);
            }
            setTimeout(reposicionarGlider, 50);
            inicializarAcordeonesOrdenes();
            cargarTodo();
            cargarProductosCatalogo();
            cargarTasaBcvAdmin();
        }

        function cerrarSesion() {
            sessionStorage.removeItem(PASSWORD_KEY);
            sessionStorage.removeItem(ACTIVIDAD_KEY);
            try { sessionStorage.removeItem(LLAVE_CACHE); } catch (e) {}   // no dejar ventas guardadas en el equipo
            try { mostrarPantallaAccion(null); } catch (e) {}
            panelPrincipal.classList.add('hidden');
            pantallaLogin.classList.remove('hidden');
            inputPassword.value = '';
        }

        function marcarActualizado() {
            const el = document.getElementById('ultimaActualizacion');
            if (!el) return;
            const ahora = new Date();
            el.textContent = 'Al día a las ' + ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }

        function renderizarHeroVendidoHoy() {
            const hoyStr = new Date().toLocaleDateString('es-VE');
            const ventasHoy = listaVentasMemoria.filter(v => v.fecha && new Date(v.fecha).toLocaleDateString('es-VE') === hoyStr && !esVentaCashea(v));
            const totales = calcularTotalesPorMoneda(ventasHoy);

            const elBs = document.getElementById('heroTotalBs');
            const elUsd = document.getElementById('heroTotalUsd');
            const elPiezasBs = document.getElementById('heroPiezasBs');
            const elPiezasUsd = document.getElementById('heroPiezasUsd');
            const elTasa = document.getElementById('heroTasaInfo');

            if (elBs) elBs.textContent = 'Bs ' + totales.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (elUsd) elUsd.textContent = '$' + totales.totalUsd.toFixed(2);
            if (elPiezasBs) elPiezasBs.textContent = totales.piezasBs + (totales.piezasBs === 1 ? ' prenda' : ' prendas');
            if (elPiezasUsd) elPiezasUsd.textContent = totales.piezasUsd + (totales.piezasUsd === 1 ? ' prenda' : ' prendas');
            if (elTasa) elTasa.textContent = tasaBcvAdmin ? 'Tasa BCV de hoy: Bs ' + tasaBcvAdmin.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + ' por dólar, solo como referencia.' : '';

            guardarCache({ heroVendidoHoy: totales });
        }
