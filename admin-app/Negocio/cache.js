/* Negocio/cache.js · generado por separar-capas.js · el código está igual que en admin.html */
        // ---------- CACHÉ LOCAL (CARGA INSTANTÁNEA MIENTRAS LLEGA LO NUEVO) ----------
        function guardarCache(datosNuevos) {
            try {
                const actual = JSON.parse(sessionStorage.getItem(LLAVE_CACHE) || '{}');
                const combinado = Object.assign({}, actual, datosNuevos);
                sessionStorage.setItem(LLAVE_CACHE, JSON.stringify(combinado));
            } catch (e) {
                // Si el navegador bloquea localStorage (modo privado, etc.), seguimos sin caché
            }
        }
