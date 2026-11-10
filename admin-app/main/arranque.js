/* main/arranque.js · generado por separar-capas.js · el código está igual que en admin.html */
        pintarVersion();

        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const clave = inputPassword.value.trim();
            if (!clave) {
                return;
            }

            setEstadoCargaLogin(true, 'Revisando tu clave...');
            const resultado = await probarPassword(clave);
            if (resultado.valida) {
                if (textoEstadoCargando) textoEstadoCargando.textContent = 'Todo bien, abriendo el panel...';
                sessionStorage.setItem(PASSWORD_KEY, clave);
                sessionStorage.setItem(ACTIVIDAD_KEY, String(Date.now()));
                setTimeout(() => {
                    setEstadoCargaLogin(false);
                    mostrarPanel();
                }, 650);
            } else {
                setEstadoCargaLogin(false);
                errorLogin.textContent = resultado.mensaje || 'Esa clave no es. Revísala e inténtalo de nuevo.';
                errorLogin.className = 'msg msg-error';
            }
        });

        document.getElementById('listaPedidos').addEventListener('click', (e) => {
            const boton = e.target.closest('button[data-accion]');
            if (!boton) return;
            const tarjeta = boton.closest('[data-idorden]');
            if (!tarjeta) return;

            if (boton.dataset.accion === 'rechazarOrden') {
                const motivo = prompt('¿Por qué lo rechazas? El cliente va a ver esto (puedes dejarlo vacío):', '');
                if (motivo === null) return;
                responderOrden(tarjeta.dataset.idorden, 'rechazarOrden', motivo.trim());
                return;
            }
            responderOrden(tarjeta.dataset.idorden, boton.dataset.accion);
        });

        window.addEventListener('popstate', () => {
            if (pantallaAccionAbierta) mostrarPantallaAccion(null);
        });

        // Cuando llega la tasa BCV (o cambia) se recalcula solo
        setInterval(function () {
            try {
                const t = (typeof tasaBcvAdmin !== 'undefined') ? tasaBcvAdmin : null;
                if (t !== vvUltimaTasa && vvEl('bloqueVuelto')) { vvUltimaTasa = t; vvCalcular(); }
            } catch (e) { /* nada */ }
        }, 1000);

        document.addEventListener('click', (e) => {
            const caja = document.getElementById('accionesV');
            if (caja && caja.classList.contains('abierto') && !caja.contains(e.target)) avAbrir(false);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') avAbrir(false);
        });

        iniciarReporte();

        (function iniciar() {
            const claveGuardada = obtenerPassword();
            if (claveGuardada) {
                mostrarPanel();
            }
        })();

        window.addEventListener('resize', reposicionarGlider);
        ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach((ev) => window.addEventListener(ev, () => {
            const t = Date.now();
            if (t - _ultimoToque > 15000) { _ultimoToque = t; marcarActividad(); }
        }, { passive: true, capture: true }));
        setInterval(() => { if (sessionStorage.getItem(PASSWORD_KEY)) obtenerPassword(); }, 30000);
        document.addEventListener('visibilitychange', () => { if (!document.hidden && sessionStorage.getItem(PASSWORD_KEY)) obtenerPassword(); });
        if (sessionStorage.getItem(PASSWORD_KEY) && !sessionStorage.getItem(ACTIVIDAD_KEY)) marcarActividad();
        window.addEventListener('load', () => setTimeout(reposicionarGlider, 100));

        setInterval(() => {
            if (!panelPrincipal.classList.contains('hidden')) cargarTodo();
        }, INTERVALO_REFRESCO);
