/* Presentacion/escaner.js · generado por separar-capas.js · el código está igual que en admin.html */
        // ===================================================================
        // ESCÁNER QR: VIBRA, SUENA Y PREGUNTA ANTES DE REPETIR UNA PRENDA
        // ===================================================================
        function emitirFeedbackEscaneo() {
            if ('vibrate' in navigator) {
                try {
                    navigator.vibrate([120, 60, 120]);
                } catch (e) {}
            }

            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    const ctx = new AudioCtx();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1800, ctx.currentTime);
                    gain.gain.setValueAtTime(0.18, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.12);
                }
            } catch (e) {}
        }

        async function abrirScannerVenta() {
            abrirPanelAccion('fisica');
            if (!productosCatalogo.length) cargarProductosCatalogo();

            ultimoCodigoEscaneado = null;
            ultimoEscaneoTiempo = 0;
            scannerVentaPausado = false;
            ocultarModalRepetido();
            if (scannerVentaTimeoutId) { clearTimeout(scannerVentaTimeoutId); scannerVentaTimeoutId = null; }
            actualizarMiniStepperScanner();

            const modal = document.getElementById('scannerModalVenta');
            const estado = document.getElementById('scannerEstadoVenta');
            const marco = document.getElementById('scannerMarcoVenta');
            modal.classList.remove('hidden'); modal.classList.add('flex');
            if (estado) { estado.textContent = 'Apunta la cámara al código QR de la prenda'; estado.className = 'text-sm mt-4 text-center font-medium'; estado.style.color = 'var(--gris)'; }
            if (marco) marco.style.borderColor = 'var(--fucsia)';
            const video = document.getElementById('scannerVideoVenta');
            try {
                scannerVentaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
                video.srcObject = scannerVentaStream;
                await video.play();
                scannerVentaRAF = requestAnimationFrame(tickScannerVenta);
            } catch (error) {
                console.error('No se pudo abrir la cámara:', error);
                if (estado) estado.textContent = 'No se pudo abrir la cámara. Revisa los permisos del navegador.';
            }
        }

        function tickScannerVenta() {
            if (scannerVentaPausado) { scannerVentaRAF = requestAnimationFrame(tickScannerVenta); return; }
            const video = document.getElementById('scannerVideoVenta');
            const canvas = document.getElementById('scannerCanvasVenta');
            if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) { scannerVentaRAF = requestAnimationFrame(tickScannerVenta); return; }
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imagen = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const codigo = jsQR(imagen.data, imagen.width, imagen.height);
            if (codigo && codigo.data) { procesarCodigoQRVenta(codigo.data); return; }
            scannerVentaRAF = requestAnimationFrame(tickScannerVenta);
        }

        function cerrarScannerVenta() {
            const modal = document.getElementById('scannerModalVenta');
            modal.classList.add('hidden'); modal.classList.remove('flex');
            if (scannerVentaRAF) cancelAnimationFrame(scannerVentaRAF);
            scannerVentaRAF = null;
            if (scannerVentaTimeoutId) { clearTimeout(scannerVentaTimeoutId); scannerVentaTimeoutId = null; }
            scannerVentaPausado = false;
            ocultarModalRepetido();
            if (scannerVentaStream) { scannerVentaStream.getTracks().forEach(t => t.stop()); scannerVentaStream = null; }
        }

        function procesarCodigoQRVenta(textoLeido) {
            let valorBusqueda = textoLeido.trim();
            try {
                const url = new URL(textoLeido);
                const param = url.searchParams.get('producto') || url.searchParams.get('buscar') || url.searchParams.get('codigo');
                if (param) valorBusqueda = param;
            } catch (e) {}

            const buscado = valorBusqueda.toLowerCase().trim();

            const ahora = Date.now();
            if (buscado === ultimoCodigoEscaneado && (ahora - ultimoEscaneoTiempo) < 2200) {
                scannerVentaRAF = requestAnimationFrame(tickScannerVenta);
                return;
            }

            const coincidencia = productosCatalogo.find(p => (p.codigo || '').toLowerCase().trim() === buscado)
                || productosCatalogo.find(p => (p.producto || p.nombre || '').toLowerCase().trim() === buscado);

            const estado = document.getElementById('scannerEstadoVenta');
            const marco = document.getElementById('scannerMarcoVenta');

            if (!coincidencia) {
                cerrarScannerVenta();
                document.getElementById('fisicaProducto').value = valorBusqueda;
                const mensaje = document.getElementById('mensajeFisica');
                mensaje.textContent = 'Esa prenda no está en el catálogo. Puedes escribirla a mano aquí abajo.';
                mensaje.className = 'msg msg-error';
                return;
            }

            const nombre = coincidencia.producto || coincidencia.nombre || '';
            const precio = coincidencia.precio ? parseFloat(coincidencia.precio) : 0;
            const categoria = normalizarCategoria(coincidencia.categoria);

            // ¿Ya está en la lista? Pregunta antes de duplicar.
            const indexExistente = carritoFisica.findIndex(p => p.producto.toLowerCase() === nombre.toLowerCase());

            if (indexExistente !== -1) {
                scannerVentaPausado = true;
                itemPendienteConfirmar = {
                    indice: indexExistente,
                    nombre: nombre,
                    buscado: buscado
                };
                mostrarModalRepetido(nombre, carritoFisica[indexExistente].cantidad);
                return;
            }

            // Si es nueva: la agrega, vibra y suena
            ultimoCodigoEscaneado = buscado;
            ultimoEscaneoTiempo = ahora;

            agregarItemCarritoFisica({ producto: nombre, precio, categoria, cantidad: 1, codigo: coincidencia.codigo || '' });
            emitirFeedbackEscaneo();

            scannerVentaPausado = true;
            if (estado) {
                estado.textContent = `✅ Agregada: ${nombre}`;
                estado.className = 'text-sm mt-4 text-center font-bold';
                estado.style.color = '#6EE7B7';
            }
            if (marco) marco.style.borderColor = '#34D399';

            if (scannerVentaTimeoutId) clearTimeout(scannerVentaTimeoutId);
            scannerVentaTimeoutId = setTimeout(() => {
                scannerVentaPausado = false;
                if (estado) {
                    estado.textContent = 'Apunta la cámara a la siguiente prenda';
                    estado.className = 'text-sm mt-4 text-center font-medium';
                    estado.style.color = 'var(--gris)';
                }
                if (marco) marco.style.borderColor = 'var(--fucsia)';
            }, 1400);

            scannerVentaRAF = requestAnimationFrame(tickScannerVenta);
        }

        // ---------- AVISO DE PRENDA REPETIDA ----------
        function mostrarModalRepetido(nombre, cantidadActual) {
            const modalRepetido = document.getElementById('scannerConfirmacionRepetido');
            const nomEl = document.getElementById('scannerRepetidoNombre');
            const cantEl = document.getElementById('scannerRepetidoCant');
            if (nomEl) nomEl.textContent = nombre;
            if (cantEl) cantEl.textContent = String(cantidadActual);
            if (modalRepetido) modalRepetido.classList.remove('hidden');

            if ('vibrate' in navigator) {
                try { navigator.vibrate(70); } catch (e) {}
            }
        }

        function ocultarModalRepetido() {
            const modalRepetido = document.getElementById('scannerConfirmacionRepetido');
            if (modalRepetido) modalRepetido.classList.add('hidden');
        }

        function confirmarRepetidoScanner() {
            if (itemPendienteConfirmar) {
                const { indice, buscado } = itemPendienteConfirmar;
                if (carritoFisica[indice]) {
                    carritoFisica[indice].cantidad += 1;
                    ultimoIndiceEscaneado = indice;
                    renderizarCarritoFisica();
                    emitirFeedbackEscaneo();

                    const estado = document.getElementById('scannerEstadoVenta');
                    if (estado) {
                        estado.textContent = `✅ Van ${carritoFisica[indice].cantidad} de ${carritoFisica[indice].producto}`;
                        estado.className = 'text-sm mt-4 text-center font-bold';
                        estado.style.color = '#6EE7B7';
                    }
                }
                ultimoCodigoEscaneado = buscado;
                ultimoEscaneoTiempo = Date.now();
            }
            ocultarModalRepetido();
            itemPendienteConfirmar = null;

            setTimeout(() => {
                scannerVentaPausado = false;
                scannerVentaRAF = requestAnimationFrame(tickScannerVenta);
            }, 1200);
        }

        function cancelarRepetidoScanner() {
            if (itemPendienteConfirmar) {
                ultimoCodigoEscaneado = itemPendienteConfirmar.buscado;
                ultimoEscaneoTiempo = Date.now();
            }
            ocultarModalRepetido();
            itemPendienteConfirmar = null;

            const estado = document.getElementById('scannerEstadoVenta');
            if (estado) {
                estado.textContent = 'Listo, no se repitió. Apunta a la siguiente prenda.';
                estado.className = 'text-sm mt-4 text-center font-medium';
                estado.style.color = 'var(--gris)';
            }

            setTimeout(() => {
                scannerVentaPausado = false;
                scannerVentaRAF = requestAnimationFrame(tickScannerVenta);
            }, 800);
        }

        function registrarVentaDesdeScanner() {
            cerrarScannerVenta();
            registrarVentaFisica();
        }
