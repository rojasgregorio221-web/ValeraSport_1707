/* Presentacion/modulos/imagenes-producto.js · generado por separar-capas.js · el código está igual que en admin.html */
(function () {
    'use strict';
    if (window.VSIMG) return;
    window.VSIMG = {}; /*vsimg-multi*/
    window.VSIMG.partir = function (t) {
        return String(t == null ? '' : t).split(/[\s,;|]+/).filter(Boolean);
    };
    var COLUMNA = 'imagen';
    var $ = function (id) { return document.getElementById(id); };

    function iniciar() {
        var nombre = $('invNombre');
        if (!nombre || typeof productosCatalogo === 'undefined') return false;
        if ($('invImagen')) return true;

        var st = document.createElement('style');
        st.textContent =
            '.vsimg-prev{margin-top:8px;display:none;align-items:center;gap:10px}' +
            '.vsimg-prev.on{display:flex}' +
            '.vsimg-prev img{width:64px;height:64px;object-fit:cover;border-radius:12px;border:1px solid var(--linea);background:#F8FAFC}' +
            '.vsimg-prev span{font-size:11px;color:var(--tenue)}' +
            '.vsimg-prev{flex-direction:column;align-items:flex-start}' +
            '#invImagen{min-height:84px;resize:vertical;line-height:1.45;font-size:12px;white-space:pre;overflow:auto}' +
            '.vsimg-thumb{flex:none;width:52px;height:52px;object-fit:cover;border-radius:12px;border:1px solid var(--linea);background:#F8FAFC}' +
            '.inv-top.vsimg-fila{align-items:center}';
        document.head.appendChild(st);

        var wrap = document.createElement('div');
        wrap.innerHTML =
            '<label class="etiqueta" for="invImagen">Imagen (URL)</label>' +
            '<textarea id="invImagen" class="campo" rows="3" spellcheck="false" autocomplete="off" placeholder="Una URL por línea (o separadas por espacio)&#10;https://i.postimg.cc/xxxx/foto1.jpg&#10;https://i.postimg.cc/yyyy/foto2.jpg"></textarea>' +
            '<p class="inv-ayuda">Puedes pegar VARIAS fotos: una por línea o separadas por espacio. La primera es la principal.</p>' +
            '<div class="vsimg-prev" id="invImgPrev"><div id="invImgStrip" style="display:flex;flex-wrap:wrap;gap:6px"></div><span id="invImgTxt"></span></div>';
        var ref = nombre.parentElement;
        ref.parentElement.insertBefore(wrap, ref.nextSibling);

        var campo = $('invImagen'), tag = $('invImgTag'), prev = $('invImgPrev'), txt = $('invImgTxt');

        function actualizarPrev() {
            var lista = window.VSIMG.partir(campo.value);
            var strip = $('invImgStrip');
            var tok = (actualizarPrev.t = (actualizarPrev.t || 0) + 1);
            if (strip) strip.innerHTML = '';
            if (!lista.length) { prev.classList.remove('on'); return; }
            prev.classList.add('on');
            txt.textContent = 'Cargando ' + lista.length + (lista.length === 1 ? ' foto...' : ' fotos...');
            var ok = 0, mal = 0;
            function fin() {
                if (tok !== actualizarPrev.t || ok + mal < lista.length) return;
                txt.textContent = mal
                    ? (ok + ' cargan, ' + mal + ' no cargan: revisa que sean enlaces directos')
                    : (lista.length === 1 ? 'La foto carga bien' : 'Las ' + lista.length + ' fotos cargan bien (la primera es la principal)');
            }
            lista.forEach(function (u, i) {
                var im = document.createElement('img');
                im.alt = 'Foto ' + (i + 1);
                im.referrerPolicy = 'no-referrer';
                im.onload = function () { ok++; fin(); };
                im.onerror = function () { mal++; im.style.opacity = '.35'; im.style.outline = '2px solid #BE123C'; fin(); };
                im.src = u;
                if (strip) strip.appendChild(im);
            });
        }
        campo.addEventListener('input', actualizarPrev);

        function imagenDe(p) {
            if (!p) return '';
            if (p[COLUMNA]) return p[COLUMNA];
            try {
                var e = typeof p.extra === 'string' ? JSON.parse(p.extra) : p.extra;
                return (e && e[COLUMNA]) || '';
            } catch (er) { return ''; }
        }
        function buscar(codigo, nom) {
            var c = String(codigo || '').trim().toLowerCase();
            var n = String(nom || '').trim().toLowerCase();
            return productosCatalogo.filter(function (x) {
                if (c && String(x.codigo || '').trim().toLowerCase() === c) return true;
                return !c && n && String(x.producto || x.nombre || '').trim().toLowerCase() === n;
            })[0] || null;
        }

        function llenar() {
            setTimeout(function () {
                var p = buscar($('invCodigo').value, $('invNombre').value);
                campo.value = window.VSIMG.partir(imagenDe(p)).join('\n');
                actualizarPrev();
            }, 0);
        }
        document.addEventListener('click', function (e) {
            var t = e.target;
            if (t.closest && (t.closest('[data-act="editar"]') || t.closest('#invNueva'))) llenar();
        });

        $('invGuardar').addEventListener('click', function (e) {
            var v = campo.value.trim();
            if (v && !window.VSIMG.partir(v).every(function (u) { return /^https:\/\/\S+$/i.test(u); })) {
                e.stopImmediatePropagation();
                var err = $('invErr');
                err.textContent = 'Cada imagen debe ser un enlace que empiece por https://';
                err.classList.remove('hidden');
            }
        }, true);

        var fetchOriginal = window.fetch.bind(window);
        window.fetch = function (url, opts) {
            var pendiente = null;
            try {
                if (opts && typeof opts.body === 'string' && String(url).indexOf('/api/admin-pedidos') !== -1) {
                    var c = JSON.parse(opts.body);
                    if (c.accion === 'guardarProducto' && c.producto) {
                        c.producto[COLUMNA] = window.VSIMG.partir(campo.value).join(' ');
                        pendiente = { codigo: c.producto.codigo, nombre: c.producto.nombre, img: c.producto[COLUMNA] };
                        opts = Object.assign({}, opts, { body: JSON.stringify(c) });
                    }
                }
            } catch (er) { }
            var r = fetchOriginal(url, opts);
            if (pendiente) {
                r.then(function () {
                    var p = buscar(pendiente.codigo, pendiente.nombre);
                    if (p) p[COLUMNA] = pendiente.img;
                    miniaturas();
                }).catch(function () { });
            }
            return r;
        };

        function miniaturas() {
            var lista = $('invLista');
            if (!lista) return;
            var tarjetas = lista.querySelectorAll('.inv-card');
            for (var i = 0; i < tarjetas.length; i++) {
                var card = tarjetas[i];
                if (card.querySelector('.vsimg-thumb')) continue;
                var nEl = card.querySelector('.inv-nombre');
                var mEl = card.querySelector('.inv-meta');
                var top = card.querySelector('.inv-top');
                if (!nEl || !top) continue;
                var cod = mEl ? String(mEl.textContent).split(' · ')[0].trim() : '';
                if (cod === 'sin código') cod = '';
                var url = window.VSIMG.partir(imagenDe(buscar(cod, nEl.textContent)))[0] || '';
                if (!/^https:\/\//i.test(url)) continue;
                var im = document.createElement('img');
                im.className = 'vsimg-thumb';
                im.alt = '';
                im.loading = 'lazy';
                im.referrerPolicy = 'no-referrer';
                im.onerror = function () { this.remove(); };
                im.src = url;
                top.insertBefore(im, top.firstChild);
                top.classList.add('vsimg-fila');
                var texto = top.children[1];
                if (texto) { texto.style.flex = '1 1 auto'; texto.style.marginLeft = '10px'; }
            }
        }
        var lista = $('invLista');
        if (lista && window.MutationObserver) {
            var ocupado = false;
            new MutationObserver(function () {
                if (ocupado) return;
                ocupado = true;
                setTimeout(function () { ocupado = false; miniaturas(); }, 30);
            }).observe(lista, { childList: true });
            miniaturas();
        }
        console.log('[VSIMG] campo de imagen activo');
        return true;
    }

    if (!iniciar()) {
        var n = 0;
        var w = setInterval(function () {
            if (iniciar() || ++n > 30) clearInterval(w);
        }, 300);
    }
})();
