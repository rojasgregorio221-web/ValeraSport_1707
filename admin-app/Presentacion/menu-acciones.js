/* Presentacion/menu-acciones.js · generado por separar-capas.js · el código está igual que en admin.html */
        // ===================================================================
        // MENÚ DE ACCIONES (la V): se abre y se cierra con una animación
        // ===================================================================
        function avAbrir(abrir) {
            const caja = document.getElementById('accionesV');
            const boton = document.getElementById('avDisparador');
            const panel = document.getElementById('avPanel');
            if (!caja || !boton) return;
            const estado = (typeof abrir === 'boolean') ? abrir : !caja.classList.contains('abierto');
            caja.classList.toggle('abierto', estado);
            boton.setAttribute('aria-expanded', String(estado));
            boton.setAttribute('aria-label', estado ? 'Cerrar acciones' : 'Abrir acciones');
            if (panel) {
                panel.setAttribute('aria-hidden', String(!estado));
                panel.inert = !estado;
            }
        }

        function avElegir(accion) {
            avAbrir(false);
            if (accion === 'fisica') toggleFormularioFisica();
            else if (accion === 'escanear') abrirScannerVenta();
            else if (accion === 'qr') toggleFormularioQR();
        }
