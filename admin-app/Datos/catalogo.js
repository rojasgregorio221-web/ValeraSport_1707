/* Datos/catalogo.js · generado por separar-capas.js · el código está igual que en admin.html */
        // ---------- CATÁLOGO ----------
        async function cargarProductosCatalogo() {
            try {
                const respuesta = await fetch('/api/obtener-productos?t=' + Date.now());
                if (!respuesta.ok) return;
                const texto = await respuesta.text();
                productosCatalogo = parseCSV(texto);
                poblarDatalistProductos();
            } catch (e) {
                console.error('No se pudo cargar el catálogo:', e);
            }
        }

        async function cargarTasaBcvAdmin() {
            try {
                const resp = await fetch('/api/tasa-bcv');
                const datos = await resp.json();
                tasaBcvAdmin = (datos.ok && datos.tasa) ? Number(datos.tasa) : null;
            } catch (e) {
                tasaBcvAdmin = null;
            }
            actualizarPrecioBsFisica();
            renderizarHeroVendidoHoy();
            renderizarListaVentas();
            renderizarCarritoFisica();
            try { vvCalcular(); } catch (e) { console.error(e); }
        }
