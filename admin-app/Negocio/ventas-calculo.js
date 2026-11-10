/* Negocio/ventas-calculo.js · generado por separar-capas.js · el código está igual que en admin.html */
        function calcularTotalesPorMoneda(ventasArr) {
            let totalBs = 0, totalUsd = 0, piezasBs = 0, piezasUsd = 0;
            (ventasArr || []).forEach(v => {
                if ((v.metodoPago || '').toLowerCase().trim() === 'fiado') return; // fiado: aún no cobrado
                if (esMetodoUsd(v.metodoPago)) {
                    totalUsd += Number(v.precio) || 0;
                    piezasUsd++;
                } else {
                    const bs = v.precioBs != null && v.precioBs !== '' ? Number(v.precioBs) : (tasaBcvAdmin ? (Number(v.precio) || 0) * tasaBcvAdmin : 0);
                    totalBs += bs;
                    piezasBs++;
                }
            });
            return { totalBs, totalUsd, piezasBs, piezasUsd };
        }

        // Agrupa las ventas de una misma transacción (mismo escaneo/registro en lote).
        function agruparVentas(ventas) {
            const grupos = new Map();
            const orden = [];
            ventas.forEach(v => {
                const clave = [v.fecha || '', v.metodoPago || '', v.correo || '', v.nota || '', v.canal || ''].join('|');
                if (!grupos.has(clave)) { grupos.set(clave, []); orden.push(clave); }
                grupos.get(clave).push(v);
            });
            return orden.map(clave => grupos.get(clave));
        }
        function repMontoVenta(v) {
            if (esMetodoUsd(v.metodoPago)) return Number(v.precio) || 0;
            if (v.precioBs != null && v.precioBs !== '') return Number(v.precioBs) || 0;
            return tasaBcvAdmin ? (Number(v.precio) || 0) * tasaBcvAdmin : 0;
        }
