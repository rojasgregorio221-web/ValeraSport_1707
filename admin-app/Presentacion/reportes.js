/* Presentacion/reportes.js · generado por separar-capas.js · el código está igual que en admin.html */
        function iniciarReporte() {
            const hoy = fechaLocalISO(new Date());
            const d = document.getElementById('repDesde');
            const h = document.getElementById('repHasta');
            if (d && !d.value) d.value = hoy;
            if (h && !h.value) h.value = hoy;
        }

        function repAlCambiarModo() {
            const modo = document.getElementById('repModo').value;
            const etq = document.getElementById('repEtqDesde');
            if (etq) etq.textContent = modo === 'dia' ? 'Día' : (modo === 'semana' ? 'Cualquier día de esa semana' : 'Desde');
            document.getElementById('repBloqueHasta').classList.toggle('hidden', modo !== 'rango');
        }

        function reportePreset(tipo) {
            document.getElementById('repModo').value = tipo === 'hoy' ? 'dia' : 'semana';
            const f = new Date();
            if (tipo === 'pasada') f.setDate(f.getDate() - 7);
            document.getElementById('repDesde').value = fechaLocalISO(f);
            repAlCambiarModo();
            descargarReporte();
        }

        async function descargarReporte() {
            const mensaje = document.getElementById('mensajeReporte');
            mensaje.classList.add('hidden');

            if (!window.jspdf) {
                mensaje.textContent = 'No cargó la librería del PDF. Revisa la conexión y recarga la página.';
                mensaje.className = 'msg msg-error';
                return;
            }
            const rango = rangoReporte();
            if (!rango) {
                mensaje.textContent = 'Elige la fecha para el reporte.';
                mensaje.className = 'msg msg-error';
                return;
            }

            try { await cargarVentas(); } catch (e) { /* se usa lo que ya hay en pantalla */ }

            const ventas = listaVentasMemoria
                .filter(v => v.fecha && (v.metodoPago || '').toLowerCase().trim() !== 'fiado')
                .filter(v => { const f = new Date(v.fecha); return f >= rango.ini && f <= rango.fin; })
                .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

            if (!ventas.length) {
                mensaje.textContent = 'No hay ventas en ese periodo.';
                mensaje.className = 'msg msg-warn';
                return;
            }

            generarPDFVentas(ventas, rango);
            mensaje.textContent = '✅ Reporte descargado.';
            mensaje.className = 'msg msg-ok';
        }

        function generarPDFVentas(ventas, rango) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'pt', format: 'a4' });
            const M = 40;
            const AZUL = [4, 107, 168];
            const total = calcularTotalesPorMoneda(ventas);

            const mismoDia = fechaLocalISO(rango.ini) === fechaLocalISO(rango.fin);
            const periodoTxt = mismoDia
                ? repTextoDia(rango.ini)
                : 'Del ' + rango.ini.toLocaleDateString('es-VE') + ' al ' + rango.fin.toLocaleDateString('es-VE');

            // ---- Encabezado ----
            doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(14, 17, 22);
            doc.text(NOMBRE_NEGOCIO, M, 52);
            doc.setFontSize(12); doc.setTextColor(AZUL[0], AZUL[1], AZUL[2]);
            doc.text('Reporte de ventas', M, 70);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90);
            doc.text(periodoTxt, M, 86);
            doc.text('Generado el ' + new Date().toLocaleString('es-VE'), M, 100);

            // ---- Totales del periodo (cada moneda por su lado) ----
            doc.setDrawColor(220); doc.setFillColor(246, 249, 252);
            doc.roundedRect(M, 114, 515, 62, 8, 8, 'FD');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(110);
            doc.text('TOTAL EN BOLÍVARES', M + 16, 132);
            doc.text('TOTAL EN DIVISAS', M + 270, 132);
            doc.setFontSize(17); doc.setTextColor(14, 17, 22);
            doc.text(repBs(total.totalBs), M + 16, 156);
            doc.text(repUsd(total.totalUsd), M + 270, 156);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(110);
            doc.text(total.piezasBs + (total.piezasBs === 1 ? ' prenda' : ' prendas'), M + 16, 170);
            doc.text(total.piezasUsd + (total.piezasUsd === 1 ? ' prenda' : ' prendas'), M + 270, 170);

            // ---- Agrupar por día ----
            const porDia = new Map();
            ventas.forEach(v => {
                const k = fechaLocalISO(new Date(v.fecha));
                if (!porDia.has(k)) porDia.set(k, []);
                porDia.get(k).push(v);
            });

            // ---- Resumen por día (todos los días del periodo si son 31 o menos) ----
            const filasResumen = [];
            const dias = [];
            const cursor = new Date(rango.ini);
            cursor.setHours(0, 0, 0, 0);
            const limite = new Date(rango.fin);
            while (cursor <= limite) { dias.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1); }
            const listaDias = dias.length <= 31 ? dias : [...porDia.keys()].sort().map(fechaDesdeISO);
            listaDias.forEach(d => {
                const delDia = porDia.get(fechaLocalISO(d)) || [];
                const t = calcularTotalesPorMoneda(delDia);
                filasResumen.push([repTextoDia(d), String(t.piezasBs + t.piezasUsd), repBs(t.totalBs), repUsd(t.totalUsd)]);
            });

            doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(14, 17, 22);
            doc.text('Resumen por día', M, 202);
            doc.autoTable({
                startY: 210, margin: { left: M, right: M },
                head: [['Día', 'Prendas', 'Bolívares', 'Divisas']],
                body: filasResumen,
                foot: [['Total del periodo', String(total.piezasBs + total.piezasUsd), repBs(total.totalBs), repUsd(total.totalUsd)]],
                showFoot: 'lastPage',
                styles: { fontSize: 9, cellPadding: 5 },
                headStyles: { fillColor: AZUL },
                footStyles: { fillColor: [230, 238, 245], textColor: 20, fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
            });
            let y = doc.lastAutoTable.finalY + 22;

            // ---- Resumen por semana (solo si el periodo pasa de 7 días) ----
            if (dias.length > 7) {
                const porSemanaMapa = new Map();
                ventas.forEach(v => {
                    const ini = inicioDeSemana(new Date(v.fecha));
                    const k = fechaLocalISO(ini);
                    if (!porSemanaMapa.has(k)) porSemanaMapa.set(k, { ini, ventas: [] });
                    porSemanaMapa.get(k).ventas.push(v);
                });
                const filasSemana = [...porSemanaMapa.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, s]) => {
                    const t = calcularTotalesPorMoneda(s.ventas);
                    return [rangoSemana(s.ini), String(t.piezasBs + t.piezasUsd), repBs(t.totalBs), repUsd(t.totalUsd)];
                });
                if (y > 700) { doc.addPage(); y = 50; }
                doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(14, 17, 22);
                doc.text('Resumen por semana', M, y);
                doc.autoTable({
                    startY: y + 8, margin: { left: M, right: M },
                    head: [['Semana', 'Prendas', 'Bolívares', 'Divisas']],
                    body: filasSemana,
                    styles: { fontSize: 9, cellPadding: 5 },
                    headStyles: { fillColor: AZUL },
                    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
                });
                y = doc.lastAutoTable.finalY + 22;
            }

            // ---- Detalle día por día ----
            doc.addPage();
            y = 50;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(14, 17, 22);
            doc.text('Detalle de ventas', M, y);
            y += 22;

            [...porDia.keys()].sort().forEach(k => {
                const delDia = porDia.get(k);
                const t = calcularTotalesPorMoneda(delDia);
                if (y > 730) { doc.addPage(); y = 50; }

                doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(AZUL[0], AZUL[1], AZUL[2]);
                doc.text(repTextoDia(fechaDesdeISO(k)), M, y);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
                doc.text(repBs(t.totalBs) + '   |   ' + repUsd(t.totalUsd), M + 515, y, { align: 'right' });

                const filas = agruparVentas(delDia).map(g => {
                    const p = g[0];
                    const usdGrupo = esMetodoUsd(p.metodoPago);
                    const suma = g.reduce((s, v) => s + repMontoVenta(v), 0);
                    let detalle = g.map(v => (v.producto || 'Prenda')).join('\n');
                    if (p.nota) detalle += '\nNota: ' + p.nota;
                    return [
                        new Date(p.fecha).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
                        detalle,
                        p.metodoPago || '',
                        usdGrupo ? repUsd(suma) : repBs(suma)
                    ];
                });

                doc.autoTable({
                    startY: y + 8, margin: { left: M, right: M },
                    head: [['Hora', 'Detalle', 'Pago', 'Monto']],
                    body: filas,
                    styles: { fontSize: 8.5, cellPadding: 4, valign: 'top' },
                    headStyles: { fillColor: [235, 241, 247], textColor: 40 },
                    columnStyles: { 0: { cellWidth: 48 }, 2: { cellWidth: 90 }, 3: { cellWidth: 95, halign: 'right', fontStyle: 'bold' } }
                });
                y = doc.lastAutoTable.finalY + 24;
            });

            // ---- Nota y numeración ----
            if (y > 760) { doc.addPage(); y = 50; }
            doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(110);
            doc.text('Cada moneda se suma por separado; no se convierte una en otra. Las ventas fiadas sin cobrar no están incluidas.', M, y);

            const paginas = doc.getNumberOfPages();
            for (let i = 1; i <= paginas; i++) {
                doc.setPage(i);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(140);
                doc.text('Página ' + i + ' de ' + paginas, 595 - M, 820, { align: 'right' });
            }

            const nombreArchivo = mismoDia
                ? 'ventas_' + fechaLocalISO(rango.ini) + '.pdf'
                : 'ventas_' + fechaLocalISO(rango.ini) + '_al_' + fechaLocalISO(rango.fin) + '.pdf';
            doc.save(nombreArchivo);
        }
