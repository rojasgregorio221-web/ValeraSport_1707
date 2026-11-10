/* Presentacion/pantallas.js · generado por separar-capas.js · el código está igual que en admin.html */
        // ===================================================================
        // PANTALLAS DE ACCIÓN (Vender en la tienda / Crear QR)
        // Se declara UNA sola vez. Usa el historial del navegador, así el
        // botón "atrás" del celular también regresa al panel.
        // ===================================================================
        const PANELES_ACCION = {
            fisica: { form: 'formularioFisica' },
            qr: { form: 'formularioQR' },
            version: { form: 'pantallaVersion' },
        };
        let pantallaAccionAbierta = null;

        function mostrarPantallaAccion(nombre) {
            Object.keys(PANELES_ACCION).forEach((clave) => {
                const el = document.getElementById(PANELES_ACCION[clave].form);
                if (el) el.classList.toggle('abierta', clave === nombre);
            });
            document.body.style.overflow = nombre ? 'hidden' : '';
            pantallaAccionAbierta = nombre;
            if (nombre) {
                const el = document.getElementById(PANELES_ACCION[nombre].form);
                if (el) el.scrollTop = 0;
            }
        }

        // abrirPanelAccion('fisica' | 'qr') abre la pantalla; abrirPanelAccion(null) vuelve al panel.
        function abrirPanelAccion(nombre) {
            if (nombre) {
                const yaHabiaUna = pantallaAccionAbierta;
                mostrarPantallaAccion(nombre);
                if (!yaHabiaUna) {
                    try { history.pushState({ vsPantalla: nombre }, ''); } catch (e) {}
                }
            } else if (pantallaAccionAbierta && history.state && history.state.vsPantalla) {
                history.back();
            } else {
                mostrarPantallaAccion(null);
            }
        }

        function toggleFormularioFisica() { abrirPanelAccion('fisica'); }
        function toggleFormularioQR() { abrirPanelAccion('qr'); }
