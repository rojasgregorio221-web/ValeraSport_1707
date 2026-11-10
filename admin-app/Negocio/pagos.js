/* Negocio/pagos.js · generado por separar-capas.js · el código está igual que en admin.html */
        // Métodos de pago que se cobran en dólares/divisas reales (sin pasar por Bs)
        const METODOS_USD = ['efectivo usd', 'zelle', 'binance', 'cashea usd'];

        function esMetodoUsd(metodo) {
            return METODOS_USD.includes((metodo || '').toLowerCase().trim());
        }

        // ---------- HERO "VENDIDO HOY": TOTALES REALES POR MONEDA, SIN CONVERTIR ----------
        // Las ventas con Cashea se cobran por cuotas: no suman en el resumen de la pantalla principal (sí en Ventas, semanas y PDF)
        function esVentaCashea(v) {
            return ((v && v.metodoPago) || '').toLowerCase().trim().indexOf('cashea') === 0;
        }
