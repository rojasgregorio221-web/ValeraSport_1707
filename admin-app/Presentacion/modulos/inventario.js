/* Presentacion/modulos/inventario.js · generado por separar-capas.js · el código está igual que en admin.html */
(function inventarioModulo() {
    'use strict';
    if (window.VSI) return;
    var $ = function (id) { return document.getElementById(id); };
    if (typeof PANELES_ACCION === 'undefined' || typeof cargarProductosCatalogo !== 'function' || typeof mostrarPantallaAccion !== 'function') {
        console.warn('[VSI] No encontré la base del panel.'); return;
    }
    window.VSI = {};
    var esc = function (s) { return window.escapeHTML(s); };
    var LIMITE_BAJO = 3, items = [], filtro = 'todas', busqueda = '', editando = -1, cargado = false, tmr = {};

    function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.,-]/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; }
    function usd(n) { return '$' + (Number(n) || 0).toFixed(2); }
    function toast(txt, mal) {
        var t = $('invToast'); t.textContent = txt; t.className = (mal ? 'mal ' : '') + 'on';
        clearTimeout(toast._t); toast._t = setTimeout(function () { t.className = ''; }, mal ? 4500 : 1900);
    }

    // "Negro:5, Azul:3" o "Negro|M:2" -> {lista:[{n,c}], texto, suma} o {error}
    function pares(txt, conTalla) {
        var t = String(txt || '').trim();
        if (!t) return { lista: [], texto: '', suma: 0 };
        var partes = t.split(','), vistos = {}, lista = [], suma = 0;
        for (var i = 0; i < partes.length; i++) {
            var s = partes[i].trim(); if (!s) continue;
            var j = s.lastIndexOf(':');
            if (j < 1) return { error: 'Formato inválido: "' + s + '". Usa Nombre:cantidad.' };
            var nombre = s.slice(0, j).trim(), cs = s.slice(j + 1).trim();
            if (!/^\d{1,5}$/.test(cs)) return { error: 'Cantidad inválida en "' + s + '".' };
            if (!nombre || nombre.length > 60 || nombre.indexOf(':') !== -1) return { error: 'Nombre inválido en "' + s + '".' };
            if (conTalla) {
                var m = nombre.split('|');
                if (m.length !== 2 || !m[0].trim() || !m[1].trim()) return { error: 'Usa Color|Talla:cantidad en "' + s + '".' };
                nombre = m[0].trim() + '|' + m[1].trim();
            } else if (nombre.indexOf('|') !== -1) return { error: 'En colores no uses "|" ("' + s + '").' };
            var k = nombre.toLowerCase();
            if (vistos[k]) return { error: 'Repetido: "' + nombre + '".' };
            vistos[k] = 1;
            var c = parseInt(cs, 10); suma += c; lista.push({ n: nombre, c: c });
        }
        return { lista: lista, texto: lista.map(function (x) { return x.n + ':' + x.c; }).join(', '), suma: suma };
    }

    function leerCatalogo() {
        items = (productosCatalogo || []).map(function (p) {
            var st = parseInt(p.stock, 10);
            return {
                raw: p, codigo: String(p.codigo || '').trim(),
                nombre: String(p.producto || p.nombre || '').trim(), precio: num(p.precio),
                categoria: (typeof normalizarCategoria === 'function' ? normalizarCategoria(p.categoria) : String(p.categoria || '')) || '',
                stock: isNaN(st) || st < 0 ? 0 : st,
                sc: String(p.stock_colores || '').trim(), sv: String(p.stock_variantes || '').trim()
            };
        }).filter(function (x) { return x.nombre; });
    }
    function volcar() {
        var crudos = items.map(function (it) {
            var r = it.raw || (it.raw = {});
            r.codigo = it.codigo; r.producto = it.nombre; r.nombre = it.nombre; r.precio = it.precio.toFixed(2);
            r.categoria = it.categoria; r.stock = String(it.stock); r.stock_colores = it.sc; r.stock_variantes = it.sv;
            return r;
        });
        productosCatalogo.splice.apply(productosCatalogo, [0, productosCatalogo.length].concat(crudos));
    }
    function servidor(accion, extra) {
        return fetch('/api/admin-pedidos', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({ password: obtenerPassword(), accion: accion }, extra || {}))
        }).then(function (r) { return r.json(); }).then(function (d) { if (!d.ok) throw new Error(d.error || 'No se pudo completar'); return d; });
    }
    function guardarRemoto(it, esNuevo, codAnt, nomAnt) {
        return servidor('guardarProducto', {
            esNuevo: !!esNuevo, codigoAnterior: codAnt || '', nombreAnterior: nomAnt || '',
            producto: { codigo: it.codigo, nombre: it.nombre, precio: it.precio.toFixed(2), categoria: it.categoria,
                        stock: it.stock, stock_colores: it.sc, stock_variantes: it.sv }
        });
    }

    var seccion = document.createElement('section');
    seccion.id = 'vs-inventario'; seccion.className = 'pantalla-accion'; seccion.setAttribute('aria-label', 'Inventario');
    seccion.innerHTML =
        '<div class="pantalla-barra">' +
            '<button type="button" onclick="abrirPanelAccion(null)" class="icon-btn btn-fantasma pantalla-volver"><i class="fa-solid fa-chevron-left text-[11px]"></i> Volver</button>' +
            '<p class="marca pantalla-titulo">Inventario</p>' +
            '<button type="button" class="vs-ref" id="invRef" aria-label="Actualizar"><i class="fa-solid fa-arrows-rotate text-sm"></i></button>' +
        '</div>' +
        '<div class="pantalla-cuerpo">' +
            '<div class="inv-resumen" id="invResumen"></div>' +
            '<div class="inv-fila"><input type="text" id="invBuscar" class="campo" placeholder="Buscar por nombre, código, color o talla..." autocomplete="off">' +
            '<button type="button" id="invNueva" class="btn-marca py-3 px-5 rounded-2xl text-sm"><i class="fa-solid fa-plus mr-1.5"></i> Agregar prenda</button></div>' +
            '<div class="inv-filtros" id="invFiltros"></div>' +
            '<p id="invConteo" class="text-[11px]" style="color: var(--tenue)"></p>' +
            '<p id="invCargando" class="vacio">Buscando inventario...</p>' +
            '<div id="invLista" class="space-y-3"></div>' +
            '<p id="invVacio" class="hidden vacio">No hay prendas con ese filtro.</p>' +
            '<button type="button" id="invCsv" class="btn-fantasma w-full py-2.5 rounded-xl text-xs"><i class="fa-regular fa-copy mr-1.5"></i> Copiar inventario como CSV</button>' +
        '</div>';
    document.body.appendChild(seccion);
    PANELES_ACCION.inventario = { form: 'vs-inventario' };

    var modal = document.createElement('div');
    modal.id = 'invModal';
    modal.innerHTML =
        '<div class="inv-hoja" role="dialog" aria-label="Prenda"><h3 class="marca" id="invTitulo">Agregar prenda</h3><div class="inv-form">' +
            '<div class="inv-g2"><div><label class="etiqueta" for="invCodigo">Código</label><input type="text" id="invCodigo" class="campo" placeholder="Automático"></div>' +
            '<div><label class="etiqueta" for="invCategoria">Categoría</label><input type="text" id="invCategoria" class="campo" list="invCats" placeholder="Damas, Caballeros..."><datalist id="invCats"></datalist></div></div>' +
            '<div><label class="etiqueta" for="invNombre">Nombre de la prenda</label><input type="text" id="invNombre" class="campo" maxlength="80"></div>' +
            '<div class="inv-g2"><div><label class="etiqueta" for="invPrecio">Precio ($)</label><input type="number" id="invPrecio" class="campo cifra" step="0.01" min="0" max="9999" inputmode="decimal"></div>' +
            '<div><label class="etiqueta" for="invStock">Stock total</label><input type="number" id="invStock" class="campo cifra" step="1" min="0" max="99999" inputmode="numeric"></div></div>' +
            '<div><label class="etiqueta" for="invSC">Stock por color (opcional)</label><input type="text" id="invSC" class="campo" placeholder="Negro:5, Azul:3">' +
                '<p class="inv-ayuda">Formato Color:cantidad separado por comas. El stock total será la suma.</p></div>' +
            '<div><label class="etiqueta" for="invSV">Stock por color y talla (opcional)</label><input type="text" id="invSV" class="campo" placeholder="Negro|M:2, Negro|L:3">' +
                '<p class="inv-ayuda">Formato Color|Talla:cantidad. Si lo llenas, manda sobre el stock por color. Usa uno solo de los dos.</p></div>' +
            '<p id="invErr" class="hidden msg msg-error"></p>' +
            '<div class="inv-botones"><button type="button" id="invCancelar" class="btn-fantasma py-3 rounded-full text-sm">Cancelar</button>' +
            '<button type="button" id="invGuardar" class="btn-marca py-3 rounded-full text-sm">Guardar</button></div>' +
        '</div></div>';
    document.body.appendChild(modal);
    var toastEl = document.createElement('div'); toastEl.id = 'invToast'; document.body.appendChild(toastEl);

    function tieneVariantes(it) { return !!(it.sc || it.sv); }
    function estado(it) {
        if (it.stock <= 0) return { cls: 'chip-danger', txt: 'Agotada' };
        if (it.stock <= LIMITE_BAJO) return { cls: 'chip-warn', txt: 'Quedan ' + it.stock };
        return { cls: 'chip-ok', txt: 'En stock' };
    }
    function coincide(it) {
        if (filtro === 'con' && !(it.stock > LIMITE_BAJO)) return false;
        if (filtro === 'bajo' && !(it.stock > 0 && it.stock <= LIMITE_BAJO)) return false;
        if (filtro === 'agotadas' && it.stock > 0) return false;
        if (busqueda && [it.nombre, it.codigo, it.categoria, it.sc, it.sv].join(' ').toLowerCase().indexOf(busqueda) === -1) return false;
        return true;
    }
    function pintarResumen() {
        var u = 0, v = 0, b = 0, a = 0;
        items.forEach(function (it) { u += it.stock; v += it.stock * it.precio; if (it.stock <= 0) a++; else if (it.stock <= LIMITE_BAJO) b++; });
        $('invResumen').innerHTML =
            '<div class="inv-dato"><span>Prendas</span><b>' + items.length + '</b></div>' +
            '<div class="inv-dato"><span>Unidades</span><b>' + u + '</b></div>' +
            '<div class="inv-dato"><span>Valor en stock</span><b>' + usd(v) + '</b></div>' +
            '<div class="inv-dato"><span>Bajo / agotadas</span><b>' + b + ' / ' + a + '</b></div>';
        $('invFiltros').innerHTML = [['todas', 'Todas'], ['con', 'Con stock'], ['bajo', 'Stock bajo'], ['agotadas', 'Agotadas']].map(function (d) {
            return '<button type="button" class="seg-btn ' + (filtro === d[0] ? 'on' : '') + '" data-f="' + d[0] + '">' + d[1] + '</button>';
        }).join('');
    }
    function tarjeta(it, i) {
        var e = estado(it), bloqueado = tieneVariantes(it);
        var sc = pares(it.sc, false).lista || [], sv = pares(it.sv, true).lista || [];
        var tags = sc.map(function (x) { return '<span class="inv-tag">' + esc(x.n) + ' · ' + x.c + '</span>'; }).join('') +
                   sv.map(function (x) { return '<span class="inv-tag t">' + esc(x.n.replace('|', ' ')) + ' · ' + x.c + '</span>'; }).join('');
        return '<div class="tarjeta inv-card" data-i="' + i + '"><div class="inv-top"><div class="min-w-0">' +
            '<p class="inv-nombre">' + esc(it.nombre) + '</p><p class="inv-meta">' + esc(it.codigo || 'sin código') + (it.categoria ? ' · ' + esc(it.categoria) : '') + '</p></div>' +
            '<span class="inv-precio">' + usd(it.precio) + '</span></div>' +
            (tags ? '<div class="inv-tags">' + tags + '</div>' : '') +
            '<div class="inv-pie"><div class="inv-stock">' +
                (bloqueado ? '' : '<button type="button" class="inv-mini" data-act="menos" aria-label="Restar uno">−</button>') +
                '<span class="inv-cant">' + it.stock + '</span>' +
                (bloqueado ? '' : '<button type="button" class="inv-mini" data-act="mas" aria-label="Sumar uno">+</button>') +
                '<span class="chip ' + e.cls + '">' + e.txt + '</span></div>' +
            '<div class="inv-acc"><button type="button" class="inv-mini" data-act="editar" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>' +
            '<button type="button" class="inv-mini" data-act="borrar" aria-label="Borrar" style="color:#BE123C"><i class="fa-solid fa-trash-can"></i></button></div></div></div>';
    }
    function render() {
        pintarResumen();
        $('invCargando').classList.toggle('hidden', cargado);
        var vis = [];
        items.forEach(function (it, i) { if (coincide(it)) vis.push([it, i]); });
        vis.sort(function (a, b) { return a[0].nombre.localeCompare(b[0].nombre, 'es'); });
        $('invLista').innerHTML = vis.map(function (v) { return tarjeta(v[0], v[1]); }).join('');
        $('invVacio').classList.toggle('hidden', !cargado || vis.length > 0);
        $('invConteo').textContent = cargado ? vis.length + (vis.length === 1 ? ' prenda' : ' prendas') : '';
    }

    function ajustar(i, delta) {
        var it = items[i]; if (!it || tieneVariantes(it)) return;
        if (it._ant == null) it._ant = it.stock;
        it.stock = Math.max(0, Math.min(99999, it.stock + delta));
        volcar(); render();
        var k = it.nombre;
        clearTimeout(tmr[k]);
        tmr[k] = setTimeout(function () {
            guardarRemoto(it, false, it.codigo, it.nombre).then(function () { it._ant = null; }).catch(function (e) {
                it.stock = it._ant == null ? it.stock : it._ant; it._ant = null; volcar(); render();
                toast('No se guardó el stock: ' + e.message, true);
            });
        }, 700);
    }
    function borrar(i) {
        var it = items[i]; if (!it) return;
        if (!confirm('¿Borrar "' + it.nombre + '" del inventario?\n\nEsto no se puede deshacer.')) return;
        var copia = items.slice(); items.splice(i, 1); volcar(); render();
        servidor('eliminarProducto', { codigo: it.codigo, nombre: it.nombre }).then(function () { toast('Prenda borrada'); }).catch(function (e) {
            items = copia; volcar(); render(); toast('No se pudo borrar: ' + e.message, true);
        });
    }
    function siguienteCodigo() {
        var max = 0;
        items.forEach(function (it) { var m = /^VS-(\d+)$/i.exec(it.codigo); if (m) max = Math.max(max, parseInt(m[1], 10)); });
        return 'VS-' + String(max + 1).padStart(3, '0');
    }
    function abrirForm(i) {
        editando = (typeof i === 'number') ? i : -1;
        var it = editando >= 0 ? items[editando] : null;
        $('invTitulo').textContent = it ? 'Editar prenda' : 'Agregar prenda';
        $('invCodigo').value = it ? it.codigo : '';
        $('invCodigo').placeholder = it ? '' : 'Automático (' + siguienteCodigo() + ')';
        $('invNombre').value = it ? it.nombre : '';
        $('invPrecio').value = it ? it.precio.toFixed(2) : '';
        $('invCategoria').value = it ? it.categoria : '';
        $('invStock').value = it ? String(it.stock) : '';
        $('invSC').value = it ? it.sc : '';
        $('invSV').value = it ? it.sv : '';
        $('invErr').classList.add('hidden');
        var cats = [];
        items.forEach(function (x) { if (x.categoria && cats.indexOf(x.categoria) === -1) cats.push(x.categoria); });
        $('invCats').innerHTML = cats.sort().map(function (c) { return '<option value="' + esc(c) + '"></option>'; }).join('');
        avisoStock();
        modal.classList.add('abierto');
        setTimeout(function () { $('invNombre').focus(); }, 50);
    }
    function avisoStock() {
        var auto = $('invSC').value.trim() || $('invSV').value.trim();
        $('invStock').disabled = !!auto;
        if (auto) {
            var v = pares($('invSV').value, true), c = pares($('invSC').value, false);
            var suma = (v.lista && v.lista.length) ? v.suma : (c.lista && c.lista.length ? c.suma : 0);
            $('invStock').value = (v.error || c.error) ? '' : String(suma);
        }
    }
    function cerrarForm() { modal.classList.remove('abierto'); }

    function leerForm() {
        var nombre = $('invNombre').value.trim().replace(/\s+/g, ' ');
        var precio = parseFloat($('invPrecio').value.trim().replace(',', '.'));
        var codigo = $('invCodigo').value.trim().toUpperCase();
        var categoria = $('invCategoria').value.trim().replace(/\s+/g, ' ');
        if (nombre.length < 2 || nombre.length > 80) return { error: 'Escribe el nombre (2 a 80 letras).' };
        if (isNaN(precio) || precio <= 0 || precio > 9999) return { error: 'El precio debe ser mayor que 0 y no pasar de 9999.' };
        var c = pares($('invSC').value, false); if (c.error) return { error: 'Stock por color: ' + c.error };
        var v = pares($('invSV').value, true); if (v.error) return { error: 'Stock por talla: ' + v.error };
        var stock;
        if (v.lista.length) stock = v.suma; else if (c.lista.length) stock = c.suma;
        else {
            var st = $('invStock').value.trim() || '0';
            if (!/^\d{1,5}$/.test(st)) return { error: 'El stock es un entero de 0 a 99999.' };
            stock = parseInt(st, 10);
        }
        if (!codigo) codigo = (editando >= 0 && items[editando].codigo) ? items[editando].codigo : siguienteCodigo();
        if (!/^[A-Z0-9_-]{2,20}$/.test(codigo)) return { error: 'Código: solo letras, números, guion y guion bajo (2 a 20).' };
        for (var k = 0; k < items.length; k++) {
            if (k === editando) continue;
            if (items[k].codigo && items[k].codigo.toUpperCase() === codigo) return { error: 'Ya existe el código ' + codigo + '.' };
            if (items[k].nombre.toLowerCase() === nombre.toLowerCase()) return { error: 'Ya existe una prenda llamada "' + nombre + '".' };
        }
        return { d: { codigo: codigo, nombre: nombre, precio: Math.round(precio * 100) / 100, categoria: categoria, stock: stock, sc: c.texto, sv: v.texto } };
    }
    function guardarForm() {
        var r = leerForm(), err = $('invErr');
        if (r.error) { err.textContent = r.error; err.classList.remove('hidden'); return; }
        err.classList.add('hidden');
        var d = r.d, esNuevo = editando < 0, it, previo = null;
        var codAnt = esNuevo ? '' : items[editando].codigo, nomAnt = esNuevo ? '' : items[editando].nombre;
        if (esNuevo) { it = { raw: {} }; items.push(it); }
        else { it = items[editando]; previo = { codigo: it.codigo, nombre: it.nombre, precio: it.precio, categoria: it.categoria, stock: it.stock, sc: it.sc, sv: it.sv }; }
        Object.assign(it, d);
        volcar(); cerrarForm(); render();
        guardarRemoto(it, esNuevo, codAnt, nomAnt).then(function (res) {
            if (res && typeof res.stock === 'number' && res.stock !== it.stock) { it.stock = res.stock; volcar(); render(); }
            toast(esNuevo ? '✓ Prenda agregada' : '✓ Cambios guardados');
        }).catch(function (e) {
            if (esNuevo) items.splice(items.indexOf(it), 1); else Object.assign(it, previo);
            volcar(); render(); toast('No se guardó en el servidor: ' + e.message, true);
        });
    }
    function copiarCsv() {
        function q(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
        var f = ['codigo,producto,precio,categoria,stock,stock_colores,stock_variantes'];
        items.forEach(function (it) { f.push([q(it.codigo), q(it.nombre), it.precio.toFixed(2), q(it.categoria), it.stock, q(it.sc), q(it.sv)].join(',')); });
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(f.join('\n')).then(function () { toast('CSV copiado'); }, function () { toast('No se pudo copiar', true); });
        else toast('Tu navegador no deja copiar', true);
    }
    function recargar() {
        var b = $('invRef'); if (b) { b.classList.remove('gira'); void b.offsetWidth; b.classList.add('gira'); }
        return Promise.resolve(cargarProductosCatalogo()).then(function () { leerCatalogo(); cargado = true; render(); })
            .catch(function () { cargado = true; render(); });
    }

    $('invLista').addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]'); if (!b) return;
        var card = b.closest('[data-i]'); if (!card) return;
        var i = parseInt(card.getAttribute('data-i'), 10), a = b.getAttribute('data-act');
        if (a === 'mas') ajustar(i, 1); else if (a === 'menos') ajustar(i, -1);
        else if (a === 'editar') abrirForm(i); else if (a === 'borrar') borrar(i);
    });
    $('invFiltros').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (b) { filtro = b.getAttribute('data-f'); render(); } });
    $('invBuscar').addEventListener('input', function () { busqueda = this.value.trim().toLowerCase(); render(); });
    $('invSC').addEventListener('input', avisoStock);
    $('invSV').addEventListener('input', avisoStock);
    $('invNueva').addEventListener('click', function () { abrirForm(); });
    $('invCsv').addEventListener('click', copiarCsv);
    $('invRef').addEventListener('click', recargar);
    $('invCancelar').addEventListener('click', cerrarForm);
    $('invGuardar').addEventListener('click', guardarForm);
    modal.addEventListener('click', function (e) { if (e.target === modal) cerrarForm(); });
    modal.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); guardarForm(); } });
    window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('abierto')) { e.stopImmediatePropagation(); cerrarForm(); }
    }, true);

    var mostrarOriginal = window.mostrarPantallaAccion;
    window.mostrarPantallaAccion = function (n) {
        var r = mostrarOriginal.apply(this, arguments);
        if (n === 'inventario') {
            if (productosCatalogo.length && !cargado) { leerCatalogo(); cargado = true; }
            render(); recargar();
        }
        return r;
    };
    function colocarMenu() {
        var nav = document.querySelector('#vsLateral .v4-nav');
        if (!nav) return false;
        if (nav.querySelector('[data-k="inventario"]')) return true;
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'vs-item'; b.setAttribute('data-k', 'inventario');
        b.innerHTML = '<span class="vs-iz"><i class="fa-solid fa-boxes-stacked vs-ic"></i><span>Inventario</span></span>';
        var g = nav.querySelector('[data-k="gastos"]');
        if (g && g.parentNode) g.parentNode.insertBefore(b, g.nextSibling); else nav.appendChild(b);
        return true;
    }
    if (!colocarMenu()) { var n = 0, w = setInterval(function () { if (colocarMenu() || ++n > 20) clearInterval(w); }, 300); }
    window.VSI.abrir = function () { abrirPanelAccion('inventario'); };
    console.log('[VSI] inventario v2 activo');
})();
