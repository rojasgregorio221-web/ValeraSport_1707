/* Negocio/fechas.js · generado por separar-capas.js · el código está igual que en admin.html */
        function formatearFechaVersion(iso) {
            if (!iso) return '';
            const d = new Date(iso + 'T00:00:00');
            if (isNaN(d.getTime())) return '';
            return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });
        }

        function claveSemana(fecha) {
            return inicioDeSemana(fecha).toISOString().slice(0, 10);
        }

        function etiquetaSemana(inicio) {
            const fin = new Date(inicio);
            fin.setDate(fin.getDate() + 6);
            const arranqueEsta = inicioDeSemana(new Date());
            const arranquePasada = new Date(arranqueEsta);
            arranquePasada.setDate(arranquePasada.getDate() - 7);

            const claveInicio = inicio.toISOString().slice(0, 10);
            if (claveInicio === arranqueEsta.toISOString().slice(0, 10)) return 'Esta semana';
            if (claveInicio === arranquePasada.toISOString().slice(0, 10)) return 'La semana pasada';

            const mismoMes = inicio.getMonth() === fin.getMonth();
            const dIni = inicio.toLocaleDateString('es-VE', mismoMes ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
            const dFin = fin.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
            return 'Del ' + dIni + ' al ' + dFin;
        }

        function rangoSemana(inicio) {
            const fin = new Date(inicio);
            fin.setDate(fin.getDate() + 6);
            return inicio.toLocaleDateString('es-VE') + ' al ' + fin.toLocaleDateString('es-VE');
        }

        function diasEntreFechas(fechaISO) {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const objetivo = new Date(fechaISO + 'T00:00:00');
            return Math.round((objetivo - hoy) / 86400000);
        }

        function estadoFiado(fechaPagoISO) {
            if (!fechaPagoISO) return { texto: 'Sin fecha', tono: 'mute' };
            const dias = diasEntreFechas(fechaPagoISO);
            if (dias < 0) return { texto: `Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`, tono: 'danger' };
            if (dias <= 2) return { texto: dias === 0 ? 'Vence hoy' : `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`, tono: 'warn' };
            return { texto: `Vence el ${new Date(fechaPagoISO + 'T00:00:00').toLocaleDateString('es-VE')}`, tono: 'mute' };
        }

        function inicioDeSemana(fecha) {
            const d = new Date(fecha);
            d.setHours(0, 0, 0, 0);
            const dia = d.getDay();
            const diferencia = (dia === 0 ? -6 : 1) - dia; // lunes como inicio de semana
            d.setDate(d.getDate() + diferencia);
            return d;
        }

        function fechaLocalISO(d) {
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
        function fechaDesdeISO(s) { return new Date(s + 'T00:00:00'); }
