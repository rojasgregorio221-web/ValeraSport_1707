/* Presentacion/version.js · generado por separar-capas.js · el código está igual que en admin.html */
        function renderizarVersiones() {
            const lista = document.getElementById('listaVersiones');
            if (!lista) return;
            lista.innerHTML = HISTORIAL_VERSIONES.map((v, i) => {
                const claseTipo = v.tipo === 'Arreglo' ? 'chip-warn' : (v.tipo === 'Novedad' ? 'chip-ok' : 'chip-mute');
                const fecha = v.fecha ? formatearFechaVersion(v.fecha) : 'Versión base';
                const cambios = (v.cambios || []).map(c => '<li>' + escapeHTML(c) + '</li>').join('');
                return '<article class="ver-item' + (i === 0 ? ' actual' : '') + '" style="--i:' + i + '">' +
                    '<div class="tarjeta p-4">' +
                        '<div class="ver-cab">' +
                            '<div class="min-w-0">' +
                                '<p class="cifra-grande ver-item-num">v' + escapeHTML(v.numero) + '</p>' +
                                '<p class="ver-item-fecha">' + escapeHTML(fecha) + '</p>' +
                            '</div>' +
                            '<div class="ver-chips">' +
                                (i === 0 ? '<span class="chip chip-marca">Actual</span>' : '') +
                                '<span class="chip ' + claseTipo + '">' + escapeHTML(v.tipo || '') + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<p class="ver-item-titulo">' + escapeHTML(v.titulo || '') + '</p>' +
                        '<ul class="ver-cambios">' + cambios + '</ul>' +
                    '</div>' +
                '</article>';
            }).join('');
        }

        function pintarVersion() {
            const v = VERSION_SISTEMA;
            const poner = (id, texto) => { const el = document.getElementById(id); if (el) el.textContent = texto; };
            poner('chipVersion', 'v' + v.numero);
            poner('loginVersion', 'v' + v.numero);
            poner('versionNumero', 'v' + v.numero);
            poner('versionTitulo', v.titulo || '');
            poner('versionFecha', v.fecha ? 'Puesta el ' + formatearFechaVersion(v.fecha) : 'Versión base');
            poner('versionConteo', HISTORIAL_VERSIONES.length + (HISTORIAL_VERSIONES.length === 1 ? ' versión registrada.' : ' versiones registradas.'));
            renderizarVersiones();
        }
