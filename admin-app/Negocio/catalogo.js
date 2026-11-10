/* Negocio/catalogo.js · generado por separar-capas.js · el código está igual que en admin.html */
        function parseCSV(texto) {
            const filas = [];
            let fila = [], campo = "", entreComillas = false;
            for (let i = 0; i < texto.length; i++) {
                const c = texto[i];
                if (entreComillas) {
                    if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
                    else if (c === '"') { entreComillas = false; }
                    else { campo += c; }
                } else {
                    if (c === '"') entreComillas = true;
                    else if (c === ',') { fila.push(campo); campo = ""; }
                    else if (c === '\n' || c === '\r') {
                        if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
                        fila = []; campo = "";
                        if (c === '\r' && texto[i + 1] === '\n') i++;
                    } else { campo += c; }
                }
            }
            if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
            if (filas.length === 0) return [];
            const cabeceras = filas[0].map(h => h.trim().toLowerCase());
            const resultados = [];
            for (let i = 1; i < filas.length; i++) {
                const f = filas[i];
                if (f.length === cabeceras.length) {
                    let obj = {};
                    for (let j = 0; j < cabeceras.length; j++) obj[cabeceras[j]] = f[j] ? f[j].trim() : "";
                    resultados.push(obj);
                }
            }
            return resultados;
        }

        function normalizarCategoria(cat) {
            const limpio = (cat || '').trim();
            if (!limpio) return '';
            const minuscula = limpio.toLowerCase();
            if (minuscula === 'revisar' || minuscula === 'combos' || minuscula === 'combo') return '';
            if (minuscula === 'caballero') return 'Caballeros';
            if (minuscula === 'dama') return 'Damas';
            if (minuscula === 'niño' || minuscula === 'nino') return 'Niños';
            if (minuscula === 'niña' || minuscula === 'nina') return 'Niñas';
            return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
        }
