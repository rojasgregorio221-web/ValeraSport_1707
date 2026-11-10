/* Negocio/reportes.js · generado por separar-capas.js · el código está igual que en admin.html */
        // ===================================================================
        // REPORTE DE VENTAS EN PDF (día, semana o rango de fechas)
        // Usa las ventas que ya están cargadas en el panel (listaVentasMemoria).
        // Cada moneda se suma por separado, sin convertir una en otra.
        // ===================================================================
        const NOMBRE_NEGOCIO = 'Valera Sport';
        function repBs(n) { return 'Bs ' + (Number(n) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
        function repUsd(n) { return '$' + (Number(n) || 0).toFixed(2); }
        function repTextoDia(d) {
            const t = d.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            return t.charAt(0).toUpperCase() + t.slice(1);
        }

        function rangoReporte() {
            const modo = document.getElementById('repModo').value;
            const desde = document.getElementById('repDesde').value;
            if (!desde) return null;
            let ini = fechaDesdeISO(desde), fin;
            if (modo === 'dia') {
                fin = new Date(ini);
            } else if (modo === 'semana') {
                ini = inicioDeSemana(ini);
                fin = new Date(ini);
                fin.setDate(fin.getDate() + 6);
            } else {
                const hasta = document.getElementById('repHasta').value;
                if (!hasta) return null;
                fin = fechaDesdeISO(hasta);
                if (fin < ini) { const t = ini; ini = fin; fin = t; }
            }
            fin.setHours(23, 59, 59, 999);
            return { ini, fin };
        }
