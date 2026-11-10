/* Presentacion/modulos/nucleo.js · generado por separar-capas.js · el código está igual que en admin.html */
(function nucleo(LOGO_B64) {
    'use strict';
    if (window.VS) return;

    const $ = (id) => document.getElementById(id);
    const panel = $('panelPrincipal');
    if (!panel || typeof PANELES_ACCION === 'undefined' || typeof mostrarPantallaAccion !== 'function' ||
        typeof abrirPanelAccion !== 'function' || typeof calcularResumenCarritoFisica !== 'function' ||
        typeof renderizarCarritoFisica !== 'function') {
        console.warn('[VS] No se encontró la base del panel; no se activó.');
        return;
    }
    const VS = window.VS = {};

    /* ======================================================================
       1. SEGURIDAD
       ====================================================================== */
    window.escapeHTML = function (v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
            .replace(/=/g, '&#61;').replace(/`/g, '&#96;');
    };
    const esc = (s) => window.escapeHTML(s);

    /* ======================================================================
       2. UTILIDADES
       ====================================================================== */
    const reducido = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const r2 = (n) => Math.round((Number(n) || 0) * 100 + 1e-6) / 100;
    const usd = (n) => '$' + (Number(n) || 0).toFixed(2);
    const bs = (n) => 'Bs ' + (Number(n) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tasa = () => Number((typeof tasaBcvAdmin !== 'undefined' && tasaBcvAdmin) || 0);
    const metodo = () => { const s = $('fisicaMetodoPago'); return s ? s.value : ''; };
    const esCashea = () => metodo() === 'Cashea';
    const girar = (btn) => { if (btn) { btn.classList.remove('gira'); void btn.offsetWidth; btn.classList.add('gira'); } };

    // Envuelve una función global del panel sin perder la original
    function envolver(nombre, despues) {
        const orig = window[nombre];
        if (typeof orig !== 'function') return;
        window[nombre] = function () {
            const r = orig.apply(this, arguments);
            try { despues.apply(this, arguments); } catch (e) { console.error('[VS]', nombre, e); }
            return r;
        };
    }

    // Llamada al servidor con la clave del panel
    function servidor(accion, extra) {
        return fetch('/api/admin-pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({ password: obtenerPassword(), accion: accion }, extra || {}))
        }).then((r) => r.json()).then((d) => {
            if (!d.ok) throw new Error(d.error || 'No se pudo completar');
            return d;
        });
    }

    /* ======================================================================
       3. CASHEA: porcentaje y fórmula (se guarda en este navegador)
          neto    -> precio / (1 - pct)  (te queda el precio base)
          recargo -> precio * (1 + pct)
       ====================================================================== */
    const LLAVE_CFG = 'vs_cashea_cfg_v2';
    const cfg = { pct: 15, modo: 'neto' };
    try {
        const g = JSON.parse(localStorage.getItem(LLAVE_CFG) || 'null');
        if (g && g.pct > 0 && g.pct < 90) cfg.pct = Number(g.pct);
        if (g && (g.modo === 'recargo' || g.modo === 'neto')) cfg.modo = g.modo;
    } catch (e) { /* sin caché */ }
    const guardarCfg = () => { try { localStorage.setItem(LLAVE_CFG, JSON.stringify(cfg)); } catch (e) { } };
    const pctTxt = () => String(cfg.pct).replace('.', ',');

    function aCashea(base) {
        base = Number(base) || 0;
        if (cfg.modo === 'neto') return Math.ceil((base / (1 - cfg.pct / 100) - 1e-9) * 100) / 100;
        return r2(base * (1 + cfg.pct / 100));
    }
    function aBase(precio) {
        precio = Number(precio) || 0;
        return cfg.modo === 'neto' ? r2(precio * (1 - cfg.pct / 100)) : r2(precio / (1 + cfg.pct / 100));
    }
    function formulaTxt() {
        return cfg.modo === 'neto'
            ? 'precio ÷ ' + (1 - cfg.pct / 100).toFixed(2).replace('.', ',')
            : 'precio × ' + (1 + cfg.pct / 100).toFixed(2).replace('.', ',');
    }

    /* ======================================================================
       4. PANTALLAS: un solo lugar donde se crean todas
       ====================================================================== */
    const MODULOS = [
        { k: 'pedidos', titulo: 'Pedidos', refresco: false, nodos: () => { const f = $('ultimaActualizacion'); return [f && f.parentElement, $('vistaPedidos')]; } },
        { k: 'ventas', titulo: 'Ventas', refresco: true, nodos: () => [$('vistaVentas')] },
        { k: 'fiados', titulo: 'Fiado', refresco: true, nodos: () => [$('vistaFiados')] },
        { k: 'gastos', titulo: 'Gastos', refresco: true, nodos: () => [$('vistaGastos')] }
    ];

    function crearPantalla(k, titulo, conRefresco, cuerpo) {
        if (PANELES_ACCION[k] && $(PANELES_ACCION[k].form)) return;
        const s = document.createElement('section');
        s.id = 'vs-' + k;
        s.className = 'pantalla-accion';
        s.setAttribute('aria-label', titulo);
        s.innerHTML =
            '<div class="pantalla-barra">' +
                '<button type="button" onclick="abrirPanelAccion(null)" class="icon-btn btn-fantasma pantalla-volver"><i class="fa-solid fa-chevron-left text-[11px]"></i> Volver</button>' +
                '<p class="marca pantalla-titulo">' + titulo + '</p>' +
                (conRefresco
                    ? '<button type="button" class="vs-ref" onclick="VS.refrescar(\'' + k + '\', this)" aria-label="Actualizar" title="Actualizar"><i class="fa-solid fa-arrows-rotate text-sm"></i></button>'
                    : '<span></span>') +
            '</div><div class="pantalla-cuerpo"></div>';
        const c = s.querySelector('.pantalla-cuerpo');
        if (typeof cuerpo === 'string') c.innerHTML = cuerpo;
        else cuerpo().forEach((n) => { if (n) c.appendChild(n); });
        document.body.appendChild(s);          // fuera del panel: nada de la portada se le cuela encima
        PANELES_ACCION[k] = { form: s.id };
    }

    // Qué se carga al abrir cada pantalla
    const AL_ABRIR = {
        pedidos: () => cambiarTabPedidos('pedidos'),
        ventas: () => cambiarTabPedidos('ventas'),
        fiados: () => cambiarTabPedidos('fiados'),
        gastos: () => cambiarTabPedidos('gastos'),
        precios: () => { renderPrecios(); if (!productosCatalogo.length) recargarCatalogo(); },
        cobros: () => cargarPlanes()
    };

    VS.refrescar = function (k, btn) {
        girar(btn);
        if (k === 'precios') recargarCatalogo();
        else if (k === 'cobros') cargarPlanes();
        else if (typeof refrescarManual === 'function') refrescarManual();
    };

    /* ---------- Transición "Persiana" ---------- */
    const N = 7;
    const persiana = document.createElement('div');
    persiana.id = 'vsPersiana';
    persiana.setAttribute('aria-hidden', 'true');
    persiana.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i><i></i>';
    document.body.appendChild(persiana);
    const tiras = Array.prototype.slice.call(persiana.children);

    const esperar = (ps, ms) => Promise.race([Promise.all(ps), new Promise((r) => setTimeout(r, ms))]);
    const fin = (a) => a.finished.catch(function () { });

    function cubrir() {
        persiana.classList.add('on');
        return esperar(tiras.map((s, i) => {
            s.style.transformOrigin = (i % 2) ? '50% 100%' : '50% 0%';
            return fin(s.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
                { duration: 100, delay: i * 11, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }));
        }), 450);
    }
    function limpiarPersiana() {
        tiras.forEach((s) => { s.getAnimations().forEach((a) => a.cancel()); s.style.transformOrigin = ''; });
        persiana.classList.remove('on');
    }
    function revelar() {
        return esperar(tiras.map((s, i) => {
            s.style.transformOrigin = (i % 2) ? '50% 0%' : '50% 100%';
            return fin(s.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }],
                { duration: 115, delay: (N - 1 - i) * 11, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' }));
        }), 450).then(limpiarPersiana);
    }
    function entrada(k) {
        const def = PANELES_ACCION[k];
        const s = def && $(def.form);
        if (!s || !s.animate) return;
        const hijos = s.querySelectorAll('.pantalla-cuerpo > *');
        let n = 0;
        for (let i = 0; i < hijos.length && n < 8; i++) {
            if (hijos[i].classList.contains('hidden')) continue;
            hijos[i].animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
                { duration: 300, delay: 30 + n * 28, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
            n++;
        }
    }

    /* ---------- Cambio de pantalla (UNA sola función envuelta) ---------- */
    const origMostrar = window.mostrarPantallaAccion;
    const origAbrir = window.abrirPanelAccion;
    let ocupado = false, hayCola = false, cola = null, bloqueo = 0;

    function aplicar(n) {
        origMostrar(n);
        document.body.classList.toggle('vs-pantalla', !!n);
        try {
            if (n && AL_ABRIR[n]) AL_ABRIR[n]();
            else if (!n) tabActiva = 'inicio';
        } catch (e) { console.error('[VS]', e); }
    }

    window.mostrarPantallaAccion = function (n) {
        n = n || null;
        const actual = (typeof pantallaAccionAbierta !== 'undefined') ? pantallaAccionAbierta : null;
        if (n === actual || reducido || panel.classList.contains('hidden') || !persiana.animate) { aplicar(n); return; }
        if (ocupado) { hayCola = true; cola = n; return; }
        ocupado = true;
        cubrir()
            .then(() => { aplicar(n); if (n) entrada(n); return revelar(); })
            .catch((e) => { console.error('[VS]', e); limpiarPersiana(); })
            .then(() => {
                ocupado = false;
                if (hayCola) { const c = cola; hayCola = false; cola = null; window.mostrarPantallaAccion(c); }
            });
    };

    // Evita que un doble toque en "Volver" retroceda dos veces
    window.abrirPanelAccion = function () {
        const ahora = Date.now();
        if (ahora < bloqueo) return;
        bloqueo = ahora + (reducido ? 150 : 400);
        return origAbrir.apply(this, arguments);
    };

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const esc = $('scannerModalVenta');
        if (esc && !esc.classList.contains('hidden')) return;
        if (VS.lateral && $('vsLateral') && $('vsLateral').classList.contains('abierto')) { VS.lateral(false); return; }
        if (typeof pantallaAccionAbierta !== 'undefined' && pantallaAccionAbierta) window.abrirPanelAccion(null);
    });

    /* ======================================================================
       5. NAVEGACIÓN: menú lateral definido en UNA lista
          [clave, icono, texto, idDelBadge, badgeRojo]
       ====================================================================== */
    const MENU = [
        { items: [['inicio', 'fa-house', 'Inicio'], ['pedidos', 'fa-boxes-packing', 'Pedidos', 'vsBadgePed'],
                  ['ventas', 'fa-chart-line', 'Ventas'], ['fiados', 'fa-user-clock', 'Fiado', 'vsBadgeFia', true],
                  ['gastos', 'fa-wallet', 'Gastos']] },
        { rotulo: 'Operaciones', items: [['fisica', 'fa-store', 'Vender en la tienda'],
                  ['escanear', 'fa-camera', 'Escanear una prenda'], ['qr', 'fa-qrcode', 'Crear un código QR']] },
        { rotulo: 'Cashea', items: [['precios', 'fa-tags', 'Lista de precios'], ['cobros', 'fa-credit-card', 'Cobros Cashea']] },
        { rotulo: 'Sistema', items: [['version', 'fa-code-branch', 'Versión del sistema', 'vsBadgeVer']] }
    ];

    function construirMenu() {
        if ($('vsLateral')) return;
        const nav = MENU.map((g) =>
            (g.rotulo ? '<p class="vs-rotulo">' + g.rotulo + '</p>' : '') +
            g.items.map((it) =>
                '<button type="button" class="vs-item" data-k="' + it[0] + '"><span class="vs-iz"><i class="fa-solid ' + it[1] + ' vs-ic"></i><span>' + it[2] + '</span></span>' +
                (it[3] ? '<span class="v4-num' + (it[4] ? ' rojo' : '') + '" id="' + it[3] + '" style="display:none">0</span>' : '') + '</button>'
            ).join('')
        ).join('');

        const el = document.createElement('div');
        el.id = 'vsLateral';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML =
            '<div class="v4-fondo" id="vsFondo"></div>' +
            '<aside class="v4-cajon" role="dialog" aria-label="Menú"><div>' +
                '<div class="v4-cab"><div class="v4-marca"><div class="v4-logo">VS</div><div><h2>VALERA<span>SPORT</span></h2><p>Menú de navegación</p></div></div>' +
                '<button type="button" class="v4-cerrar" id="vsCerrar" aria-label="Cerrar menú"><i class="fa-solid fa-xmark text-sm"></i></button></div>' +
                '<div class="v4-tasa"><span><i class="v4-vivo"></i>Tasa BCV</span><b id="vsTasaMenu">Bs --</b></div>' +
                '<nav class="v4-nav">' + nav + '</nav></div>' +
                '<div class="v4-pie"><div class="v4-estado"><span><i class="v4-vivo"></i>Sistema en línea</span><span id="vsVersionPie"></span></div>' +
                '<button type="button" class="v4-salir" id="vsSalir"><i class="fa-solid fa-arrow-right-from-bracket"></i> Salir del sistema</button></div>' +
            '</aside>';
        document.body.appendChild(el);

        $('vsFondo').addEventListener('click', () => VS.lateral(false));
        $('vsCerrar').addEventListener('click', () => VS.lateral(false));
        $('vsSalir').addEventListener('click', () => { VS.lateral(false); if (typeof cerrarSesion === 'function') cerrarSesion(); });
        el.querySelector('.v4-nav').addEventListener('click', (e) => {
            const b = e.target.closest('.vs-item');
            if (b) VS.ir(b.getAttribute('data-k'));
        });
    }

    VS.lateral = function (abrir) {
        const el = $('vsLateral');
        if (!el) return;
        el.classList.toggle('abierto', abrir);
        el.setAttribute('aria-hidden', String(!abrir));
        document.body.style.overflow = abrir ? 'hidden' : ((typeof pantallaAccionAbierta !== 'undefined' && pantallaAccionAbierta) ? 'hidden' : '');
    };

    VS.ir = function (k) {
        VS.lateral(false);
        if (k === 'inicio') {
            if (typeof pantallaAccionAbierta !== 'undefined' && pantallaAccionAbierta) window.abrirPanelAccion(null);
            else window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (k === 'escanear') { abrirScannerVenta(); return; }
        window.abrirPanelAccion(k);
    };

    /* ======================================================================
       6. INICIO: encabezado, saludo, mensaje del día, avisos
       ====================================================================== */
    const MENSAJES = [
        ['Hoy es un buen día para vender.', 'Un cliente contento trae a otro. Atiende cada venta como si fuera la primera.'],
        ['Cada prenda cuenta.', 'Las ventas grandes se arman de muchas pequeñas. Sigue sumando.'],
        ['El éxito se construye día a día.', 'Abrir la tienda con ganas ya es la mitad del trabajo.'],
        ['Vende con una sonrisa.', 'La gente recuerda cómo la atendiste más que lo que compró.'],
        ['Orden en la caja, calma en la cabeza.', 'Anota cada venta y cada gasto: lo que se mide, crece.'],
        ['Hoy puede ser tu mejor día.', 'No lo sabes hasta que abres. Abre con confianza.'],
        ['Un cliente satisfecho vuelve.', 'Cumple lo que prometes y el negocio trabaja por ti.'],
        ['La constancia vence al talento.', 'Una tienda que abre todos los días termina ganando.'],
        ['Cobra con cuidado.', 'Revisa el vuelto dos veces: la confianza se gana en los detalles.'],
        ['La buena atención no cuesta nada.', 'Y es lo que mejor se paga en una tienda.'],
        ['Tu marca es tu palabra.', 'Valera Sport crece con cada cliente que sale feliz.'],
        ['Ofrece la segunda prenda.', 'A veces el cliente solo necesita que se lo sugieran.'],
        ['Los números ordenados dan paz.', 'Revisa los fiados pendientes y cobra con respeto.'],
        ['Empieza el día con una meta.', 'Una venta más que ayer. Eso es crecer.'],
        ['Lo que hoy siembras, mañana cobra.', 'Cada cliente nuevo es una puerta que se abre.'],
        ['Que el cliente se sienta en casa.', 'Una tienda limpia y ordenada vende sola.'],
        ['Cree en lo que vendes.', 'Cuando tú confías en la prenda, el cliente también.'],
        ['Cada venta es un gracias.', 'Agradece siempre: es gratis y deja huella.'],
        ['Menos prisa, más calidad.', 'Un buen servicio hoy es una recomendación mañana.'],
        ['Trabajo constante, resultados reales.', 'Poco a poco, la caja lo dice todo.'],
        ['Hoy suma, mañana multiplica.', 'No midas el día por una venta: mídelo por lo que aprendiste.'],
        ['Un buen cierre vale oro.', 'Cuadra la caja, anota los gastos y descansa tranquilo.'],
        ['Vende lo que te gustaría comprar.', 'La honestidad llena la tienda de clientes fieles.'],
        ['El éxito es de quien insiste.', 'Que no te frene un día lento: mañana la tienda vuelve a llenarse.']
    ];

    function armarEncabezado() {
        const cab = document.querySelector('#panelPrincipal > header');
        if (!cab || $('vsBurger')) return;
        const b = document.createElement('button');
        b.type = 'button'; b.id = 'vsBurger'; b.className = 'v4-burger';
        b.setAttribute('aria-label', 'Abrir menú');
        b.innerHTML = '<i class="fa-solid fa-bars text-base"></i>';
        b.addEventListener('click', () => VS.lateral(true));
        cab.insertBefore(b, cab.firstChild);

        const pill = document.createElement('div');
        pill.className = 'v4-bcv';
        pill.innerHTML = '<i class="v4-vivo"></i><span>BCV: <b id="vsBcv">Bs --</b></span>';
        const salir = cab.querySelector('button[onclick*="cerrarSesion"]');
        if (salir) cab.insertBefore(pill, salir); else cab.appendChild(pill);

        const compactar = () => cab.classList.toggle('v4-compacto', (window.pageYOffset || document.documentElement.scrollTop || 0) > 40);
        window.addEventListener('scroll', compactar, { passive: true });
        compactar();
    }

    function pintarSaludo() {
        const hero = document.querySelector('#panelPrincipal > section.panel > .relative');
        if (!hero) return;
        let p = $('vsSaludo');
        if (!p) { p = document.createElement('div'); p.id = 'vsSaludo'; hero.insertBefore(p, hero.firstChild); }
        const h = new Date().getHours();
        const saludo = h < 12 ? 'Buenos días' : (h < 19 ? 'Buenas tardes' : 'Buenas noches');
        const fecha = new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });
        const html = '<p class="v4-saludo">' + esc(saludo) + '</p><p class="v4-fecha">' + esc(fecha) + '</p>';
        if (p.innerHTML !== html) p.innerHTML = html;
    }

    function pintarMensaje() {
        const d = new Date();
        const n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
        const m = MENSAJES[n % MENSAJES.length];
        let el = $('vsMensaje');
        if (!el) {
            const hero = document.querySelector('#panelPrincipal > section.panel');
            if (!hero) return;
            el = document.createElement('section');
            el.id = 'vsMensaje';
            hero.parentNode.insertBefore(el, hero.nextSibling);
        }
        if (el.getAttribute('data-n') === String(n)) return;
        el.setAttribute('data-n', String(n));
        el.innerHTML = '<p class="vs-eti">Para hoy</p><p class="vs-txt">' + esc(m[0]) + '</p><p class="vs-sub">' + esc(m[1]) + '</p>';
        if (el.animate) el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
            { duration: 500, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }

    // Aviso corto de la versión nueva (se quita con la X y no vuelve)
    const LLAVE_AVISO = 'vs_aviso_visto';
    let avisoDescartado = false;
    const versionActual = () => { try { return HISTORIAL_VERSIONES[0].numero; } catch (e) { return ''; } };
    const leerAviso = () => { try { return localStorage.getItem(LLAVE_AVISO); } catch (e) { return null; } };

    VS.cerrarAviso = function () {
        avisoDescartado = true;
        try { localStorage.setItem(LLAVE_AVISO, versionActual()); } catch (e) { }
        const el = $('avisoNovedad');
        if (!el) return;
        el.classList.add('sale');
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
    };

    function mostrarAviso() {
        if (avisoDescartado || $('avisoNovedad') || typeof HISTORIAL_VERSIONES === 'undefined') return;
        const v = HISTORIAL_VERSIONES[0];
        if (!v || leerAviso() === v.numero || panel.classList.contains('hidden')) return;
        const items = (v.cambios || []).slice(0, 3).map((c) => '<li>' + esc(c) + '</li>').join('');
        const el = document.createElement('div');
        el.id = 'avisoNovedad';
        el.setAttribute('role', 'status');
        el.innerHTML =
            '<div class="aviso-icono"><i class="fa-solid fa-wand-magic-sparkles"></i></div>' +
            '<div class="aviso-cuerpo"><p class="aviso-etq">' + esc(v.tipo || 'Novedad') + ' · v' + esc(v.numero) + '</p>' +
            '<p class="aviso-titulo">' + esc(v.titulo || '') + '</p><ul class="aviso-lista">' + items + '</ul></div>' +
            '<button type="button" class="aviso-x" aria-label="Cerrar aviso" onclick="VS.cerrarAviso()"><i class="fa-solid fa-xmark text-sm"></i></button>';
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('on'));
    }

    // Lo que cambia solo (cada 2 s): tasa, contadores, versión
    function latir() {
        const t = tasa();
        const tasaTxt = t ? bs(t) : 'Bs --';
        if ($('vsBcv')) $('vsBcv').textContent = tasaTxt;
        if ($('vsTasaMenu')) $('vsTasaMenu').textContent = tasaTxt + ' / $';

        const cuenta = (id) => { const b = $(id); return (!b || b.classList.contains('hidden')) ? 0 : (parseInt(b.textContent, 10) || 0); };
        const poner = (id, n) => { const e = $(id); if (e) { e.textContent = String(n); e.style.display = n ? '' : 'none'; } };
        poner('vsBadgePed', cuenta('badgePedidosPendientes'));
        poner('vsBadgeFia', cuenta('badgeFiadosVencidos'));

        const v = versionActual();
        if ($('vsBadgeVer')) { $('vsBadgeVer').textContent = v ? 'v' + v : ''; $('vsBadgeVer').style.display = v ? '' : 'none'; }
        if ($('vsVersionPie')) $('vsVersionPie').textContent = v ? 'v' + v : '';

        pintarSaludo();
        pintarMensaje();
        mostrarAviso();
    }

    /* ======================================================================
       7. VENTA EN TIENDA CON CASHEA
       ====================================================================== */
    function inyectarMetodoCashea() {
        const s = $('fisicaMetodoPago');
        if (!s || s.querySelector('option[value="Cashea"]')) return;
        const o = document.createElement('option');
        o.value = 'Cashea';
        o.textContent = 'Cashea (precio con recargo)';
        const fiado = s.querySelector('option[value="Fiado"]');
        if (fiado) s.insertBefore(o, fiado); else s.appendChild(o);
    }

    function pintarAviso() {
        const m = $('fisicaMetodoPago');
        if (!m) return;
        let a = $('csAviso');
        if (!a) {
            const grid = m.closest('.grid');
            if (!grid) return;
            a = document.createElement('div');
            a.id = 'csAviso';
            a.className = 'msg msg-warn hidden';
            grid.parentNode.insertBefore(a, grid.nextSibling);
        }
        a.classList.toggle('hidden', !esCashea());
        a.innerHTML = '<i class="fa-solid fa-credit-card mr-1.5"></i> <b>Cashea activo:</b> cada prenda se cobra a <b>' + esc(formulaTxt()) + '</b>' +
            (cfg.modo === 'neto' ? ' para que, después del ' + esc(pctTxt()) + '% de Cashea, te quede el precio base.' : ' (le suma el ' + esc(pctTxt()) + '%).') +
            ' Ya viene aplicado en la lista de abajo.';
    }

    // Cada prenda guarda su precio base y su precio actual (con Cashea o sin)
    function sincronizar() {
        const c = esCashea();
        carritoFisica.forEach((it) => {
            if (c) {
                if (it.precioBase == null) it.precioBase = Number(it.precio) || 0;
                if (!it.precioManual) it.precio = aCashea(it.precioBase);
            } else if (it.precioBase != null) {
                it.precio = it.precioBase;
                delete it.precioBase;
                delete it.precioManual;
            }
        });
    }

    function refrescarVenta() {
        sincronizar();
        renderizarCarritoFisica();
        pintarAviso();
        if (typeof actualizarPrecioBsFisica === 'function') actualizarPrecioBsFisica();
    }

    /* ---------- Plan Cashea: inicial, financiado y cuotas ---------- */
    const LIMITE_TRES_CUOTAS = 100;

    function pctInicial() {
        const v = parseFloat(String($('cpPct').value).replace(',', '.'));
        return isNaN(v) ? 40 : Math.min(100, Math.max(1, v));
    }

    function plan() {
        const total = carritoFisica.length ? r2(calcularResumenCarritoFisica().total) : 0;
        const activo = $('cpActivo').checked;
        const pct = pctInicial();
        const inicial = activo ? r2(total * pct / 100) : 0;
        const financiado = r2(total - inicial);
        const cuotas = total <= LIMITE_TRES_CUOTAS ? 3 : 6;
        const cuota = r2(financiado / cuotas);
        const ultima = r2(financiado - cuota * (cuotas - 1));
        return { total, activo, pct, inicial, financiado, cuotas, cuota, ultima, tasa: tasa() };
    }

    function renderPlan() {
        const box = $('cpBloque');
        if (!box) return;
        const visible = esCashea() && carritoFisica.length > 0;
        box.classList.toggle('hidden', !visible);
        if (!visible) return;
        const p = plan(), t = p.tasa;
        $('cpTotal').textContent = usd(p.total);
        $('cpTotalBs').textContent = t ? bs(p.total * t) : '';
        $('cpInicial').textContent = usd(p.inicial);
        $('cpInicialBs').textContent = t ? bs(p.inicial * t) : '';
        $('cpFinanciado').textContent = usd(p.financiado);
        $('cpFinanciadoBs').textContent = t ? bs(p.financiado * t) : '';
        $('cpCuotasTxt').textContent = p.cuotas + ' cuotas';
        let det = p.cuotas + ' cuotas semanales de <b>' + usd(p.cuota) + '</b>';
        if (p.ultima !== p.cuota) det += ' (la última de ' + usd(p.ultima) + ')';
        if (t) det += ' · ' + bs(p.cuota * t) + ' c/u';
        $('cpCuotasDetalle').innerHTML = p.financiado > 0 ? det : 'Sin financiado: todo se paga de inicial.';
    }
    window.cpRender = renderPlan;   // el HTML lo llama con oninput="cpRender()"

    function montarVenta() {
        envolver('alCambiarMetodoPagoFisica', refrescarVenta);
        envolver('renderizarCarritoFisica', renderPlan);
        envolver('agregarItemCarritoFisica', () => { if (esCashea()) { sincronizar(); renderizarCarritoFisica(); } });
        envolver('actualizarPrecioBsFisica', () => {
            const el = $('fisicaPrecioBs'), input = $('fisicaPrecio');
            const p = input ? parseFloat(input.value) : NaN;
            if (el && esCashea() && p > 0) el.textContent = (el.textContent ? el.textContent + ' · ' : '') + 'Con Cashea: ' + usd(aCashea(p));
        });

        // Si se cambia el precio a mano en modo Cashea, ese pasa a ser el precio final
        const origPrecioItem = window.actualizarPrecioItemFisica;
        if (typeof origPrecioItem === 'function') {
            window.actualizarPrecioItemFisica = function (indice) {
                const it = carritoFisica[indice];
                const antes = it ? it.precio : null;
                const r = origPrecioItem.apply(this, arguments);
                if (esCashea() && it && carritoFisica[indice] === it && it.precio !== antes) {
                    it.precioBase = aBase(it.precio);
                    it.precioManual = true;
                }
                return r;
            };
        }

        // Guardar la venta: UN solo envoltorio para todo lo de Cashea
        const origRegistrar = window.registrarVentaFisica;
        window.registrarVentaFisica = function () {
            if (esCashea()) {
                try {
                    // 1) Si quedó una prenda escrita sin sumar, se suma para que entre al cálculo
                    const ps = $('fisicaProducto').value.trim();
                    const pp = parseFloat($('fisicaPrecio').value);
                    if (ps && !isNaN(pp) && pp > 0) window.agregarItemCarritoFisica();

                    if (carritoFisica.length) {
                        // 2) Decidir el precio al mayor ANTES de calcular el plan
                        if (contarTotalPiezasFisica() >= 3 && aplicarDescuentoMayor === null) {
                            aplicarDescuentoMayor = confirm('Llevan ' + contarTotalPiezasFisica() + ' prendas en esta venta.\n\n' +
                                '¿Les aplicas el precio al mayor de $1.00 menos por prenda?\n\n' +
                                '• Aceptar = sí, -$1.00 por prenda\n• Cancelar = no, precio normal');
                            renderizarCarritoFisica();
                        }
                        // 3) Dejar anotado base y recargo en la nota
                        let base = 0, conCashea = 0;
                        carritoFisica.forEach((it) => {
                            const cant = parseInt(it.cantidad, 10) || 1;
                            base += (Number(it.precioBase != null ? it.precioBase : it.precio) || 0) * cant;
                            conCashea += (Number(it.precio) || 0) * cant;
                        });
                        const n = $('fisicaNota');
                        const limpia = n.value.replace(/(?:\s*·\s*)?Cashea \(base [^)]*\)/g, '').trim();
                        const txt = 'Cashea (base ' + usd(base) + ' + recargo ' + usd(conCashea - base) + ')';
                        n.value = limpia ? limpia + ' · ' + txt : txt;
                        // 4) Guardar el plan para mandarlo junto con la venta
                        window.__vsPlan = plan();
                    }
                } catch (e) { console.error('[VS] Cashea', e); }
            }
            try { return origRegistrar.apply(this, arguments); }
            finally { window.__vsPlan = null; }
        };

        // Agrega el plan a la petición de venta (la original no lo conoce)
        const fetchOriginal = window.fetch.bind(window);
        window.fetch = function (url, opts) {
            const snap = window.__vsPlan;
            if (snap && opts && typeof opts.body === 'string' && String(url).indexOf('/api/admin-pedidos') !== -1) {
                try {
                    const cuerpo = JSON.parse(opts.body);
                    if (cuerpo.accion === 'ventaFisica') {
                        cuerpo.cashea = { total: snap.total, inicial: snap.inicial, pct: snap.pct, activo: snap.activo };
                        opts = Object.assign({}, opts, { body: JSON.stringify(cuerpo) });
                    }
                } catch (e) { /* se manda igual */ }
            }
            return fetchOriginal(url, opts);
        };
    }

    /* ======================================================================
       8. LISTA DE PRECIOS (+ PDF)
       ====================================================================== */
    let catActiva = 'todas';

    const HTML_PRECIOS =
        '<div class="panel p-5">' +
            '<p class="rotulo mb-4"><i class="fa-solid fa-credit-card mr-1.5" style="color: var(--fucsia)"></i> Cálculo de Cashea</p>' +
            '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">' +
                '<div><label class="etiqueta" for="csPct">Porcentaje de Cashea (%)</label>' +
                    '<input type="number" id="csPct" step="0.5" min="1" max="60" class="campo cifra" oninput="VS.cambioCfg()"></div>' +
                '<div><label class="etiqueta" for="csModo">Cómo se calcula</label>' +
                    '<select id="csModo" class="campo" onchange="VS.cambioCfg()">' +
                        '<option value="neto">Cubrir el descuento (te queda el precio base)</option>' +
                        '<option value="recargo">Sumar el porcentaje al precio</option></select></div>' +
            '</div><p class="cs-formula" id="csFormula"></p>' +
        '</div>' +
        '<div class="panel p-5">' +
            '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">' +
                '<div><label class="etiqueta" for="csBuscar">Buscar prenda</label>' +
                    '<input type="text" id="csBuscar" placeholder="Biker, conjunto, chaqueta..." class="campo" oninput="VS.renderPrecios()"></div>' +
                '<div class="flex items-end"><label class="flex items-center gap-2.5 text-xs font-semibold cursor-pointer select-none" style="color: var(--gris); padding-bottom: 12px">' +
                    '<input type="checkbox" id="csSoloStock" onchange="VS.renderPrecios()"> Solo prendas con stock</label></div>' +
            '</div>' +
            '<div id="csCats" class="cs-chips mb-4"></div>' +
            '<p id="csResumen" class="text-[11px] mb-2" style="color: var(--tenue)"></p>' +
            '<div class="cs-scroll"><table class="cs-tabla"><thead><tr><th>Prenda</th><th>Normal</th><th>Cashea</th></tr></thead><tbody id="csLista"></tbody></table></div>' +
            '<p id="csVacio" class="hidden vacio">No hay prendas con ese filtro.</p>' +
        '</div>' +
        '<div class="panel p-5">' +
            '<p class="rotulo mb-4"><i class="fa-solid fa-file-pdf mr-1.5" style="color: var(--fucsia)"></i> Descargar PDF</p>' +
            '<label class="etiqueta" for="csPdfModo">Qué precios llevará</label>' +
            '<select id="csPdfModo" class="campo"><option value="ambos">Precio normal y precio Cashea</option><option value="normal">Solo precio normal</option><option value="cashea">Solo precio Cashea</option></select>' +
            '<p class="text-[11px] mt-2" style="color: var(--tenue)">El PDF respeta lo que tengas filtrado arriba (búsqueda, categoría y stock).</p>' +
            '<button type="button" onclick="VS.pdfPrecios()" class="btn-marca w-full py-3 rounded-full text-sm mt-4 flex items-center justify-center gap-2"><i class="fa-solid fa-download"></i> Descargar PDF</button>' +
            '<p id="csMsg" class="hidden msg"></p>' +
        '</div>';

    function itemsCatalogo() {
        const out = [];
        const lista = (typeof productosCatalogo !== 'undefined') ? productosCatalogo : [];
        lista.forEach((p) => {
            const nombre = String(p.producto || p.nombre || '').trim();
            const precio = parseFloat(String(p.precio || '').replace(/[^0-9.,-]/g, '').replace(',', '.'));
            if (!nombre || !(precio > 0)) return;
            const cat = (typeof normalizarCategoria === 'function' ? normalizarCategoria(p.categoria) : String(p.categoria || '')) || 'Otros';
            const stock = parseInt(p.stock, 10);
            out.push({ nombre, precio, cat, stock: isNaN(stock) ? null : stock });
        });
        return out;
    }

    function filtrados() {
        const q = ($('csBuscar').value || '').toLowerCase().trim();
        const soloStock = $('csSoloStock').checked;
        return itemsCatalogo().filter((f) => {
            if (catActiva !== 'todas' && f.cat !== catActiva) return false;
            if (q && f.nombre.toLowerCase().indexOf(q) === -1) return false;
            if (soloStock && !(f.stock > 0)) return false;
            return true;
        }).sort((a, b) => a.cat.localeCompare(b.cat, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
    }

    function renderPrecios() {
        if (!$('csLista')) return;
        $('csFormula').innerHTML = 'Fórmula actual: <b>' + esc(formulaTxt()) + '</b> · Ejemplo: ' + usd(10) + ' normal → <b>' + usd(aCashea(10)) + '</b> con Cashea' +
            (cfg.modo === 'neto' ? '<br>Comprobación: ' + usd(aCashea(10)) + ' menos el ' + esc(pctTxt()) + '% de Cashea = ' + usd(aCashea(10) * (1 - cfg.pct / 100)) + '.' : '');

        const cats = [];
        itemsCatalogo().forEach((f) => { if (cats.indexOf(f.cat) === -1) cats.push(f.cat); });
        cats.sort((a, b) => a.localeCompare(b, 'es'));
        if (catActiva !== 'todas' && cats.indexOf(catActiva) === -1) catActiva = 'todas';
        $('csCats').innerHTML = ['todas'].concat(cats).map((c) =>
            '<button type="button" data-cat="' + esc(c) + '" class="seg-btn ' + (catActiva === c ? 'on' : '') + '" style="border: 1px solid var(--linea)">' + (c === 'todas' ? 'Todas' : esc(c)) + '</button>'
        ).join('');

        const filas = filtrados();
        $('csResumen').textContent = filas.length + (filas.length === 1 ? ' prenda' : ' prendas');
        $('csVacio').classList.toggle('hidden', filas.length > 0);
        $('csLista').innerHTML = filas.map((f) =>
            '<tr><td><span class="font-semibold">' + esc(f.nombre) + '</span><span class="cs-cat">' + esc(f.cat) + (f.stock != null ? ' · stock ' + f.stock : '') + '</span></td>' +
            '<td class="cs-num">' + usd(f.precio) + '</td><td class="cs-num cs-cash">' + usd(aCashea(f.precio)) + '</td></tr>'
        ).join('');
    }
    VS.renderPrecios = renderPrecios;

    VS.cambioCfg = function () {
        const p = parseFloat($('csPct').value);
        if (p > 0 && p <= 60) cfg.pct = p;
        cfg.modo = $('csModo').value === 'recargo' ? 'recargo' : 'neto';
        guardarCfg();
        renderPrecios();
        if (esCashea()) refrescarVenta(); else pintarAviso();
    };

    function recargarCatalogo() {
        if (typeof cargarProductosCatalogo === 'function') {
            Promise.resolve(cargarProductosCatalogo()).then(renderPrecios).catch(renderPrecios);
        }
    }

    VS.pdfPrecios = function () {
        const msg = $('csMsg');
        msg.classList.add('hidden');
        if (!window.jspdf) { msg.textContent = 'No cargó la librería del PDF. Revisa la conexión y recarga la página.'; msg.className = 'msg msg-error'; return; }
        const filas = filtrados();
        if (!filas.length) { msg.textContent = 'No hay prendas para poner en el PDF con ese filtro.'; msg.className = 'msg msg-warn'; return; }

        const modo = $('csPdfModo').value;
        const verNormal = modo !== 'cashea', verCashea = modo !== 'normal';
        const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
        const M = 40, AZUL = [4, 107, 168], hoy = new Date();
        const cx = doc.internal.pageSize.getWidth() / 2;

        // Encabezado: logo centrado (o el nombre si el logo falla)
        let y = 82;
        try {
            const lw = 130, lh = lw * 377 / 560;
            doc.addImage(LOGO_B64, 'PNG', cx - lw / 2, 30, lw, lh, undefined, 'FAST');
            y = 30 + lh + 24;
        } catch (e) {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(14, 17, 22);
            doc.text('Valera Sport', cx, 56, { align: 'center' });
        }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(AZUL[0], AZUL[1], AZUL[2]);
        doc.text('Lista de precios', cx, y, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90);
        doc.text('Actualizada el ' + hoy.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' }), cx, y + 16, { align: 'center' });
        y += 34;

        const head = ['Prenda'];
        if (verNormal) head.push('Precio normal');
        if (verCashea) head.push('Precio Cashea');

        const body = [];
        let catActual = null;
        filas.forEach((f) => {
            if (f.cat !== catActual) {
                catActual = f.cat;
                body.push([{ content: catActual.toUpperCase(), colSpan: head.length, styles: { fillColor: [230, 238, 245], textColor: AZUL, fontStyle: 'bold' } }]);
            }
            const r = [f.nombre];
            if (verNormal) r.push(usd(f.precio));
            if (verCashea) r.push(usd(aCashea(f.precio)));
            body.push(r);
        });
        const colStyles = {};
        for (let i = 1; i < head.length; i++) colStyles[i] = { halign: 'right', cellWidth: 100 };

        doc.autoTable({ startY: y, margin: { left: M, right: M }, head: [head], body: body,
            styles: { fontSize: 9, cellPadding: 4 }, headStyles: { fillColor: AZUL }, columnStyles: colStyles });

        let yf = doc.lastAutoTable.finalY + 18;
        if (yf > 790) { doc.addPage(); yf = 50; }
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(110);
        doc.text('Precios en dólares (USD). Sujetos a cambio sin previo aviso.', M, yf);

        const paginas = doc.getNumberOfPages();
        for (let p = 1; p <= paginas; p++) {
            doc.setPage(p);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(140);
            doc.text('Página ' + p + ' de ' + paginas, 595 - M, 820, { align: 'right' });
        }
        doc.save('lista_precios_' + hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0') + '.pdf');
        msg.textContent = '✅ PDF descargado.';
        msg.className = 'msg msg-ok';
    };

    /* ======================================================================
       9. COBROS CASHEA (lo que Cashea te debe, cuota por cuota)
       ====================================================================== */
    let planes = [];

    const HTML_COBROS =
        '<div class="panel p-5">' +
            '<p class="rotulo mb-4"><i class="fa-solid fa-credit-card mr-1.5" style="color: var(--fucsia)"></i> Lo que Cashea te va a pagar</p>' +
            '<div class="grid grid-cols-2 gap-4">' +
                '<div><p class="text-[10px] font-bold uppercase tracking-[0.16em] mb-1.5" style="color: var(--cyan)">Te queda (neto)</p>' +
                    '<p id="cpTotalCobrar" class="cifra-grande text-[26px]">$0.00</p><p id="cpTotalCobrarBs" class="text-[11px] cifra mt-1" style="color: var(--tenue)"></p></div>' +
                '<div class="pl-4" style="border-left: 1px solid var(--linea)"><p class="text-[10px] font-bold uppercase tracking-[0.16em] mb-1.5" style="color: #6EE7B7">Cuota de esta semana (neto)</p>' +
                    '<p id="cpCobroSemana" class="cifra-grande text-[26px]">$0.00</p><p id="cpCobroSemanaBs" class="text-[11px] cifra mt-1" style="color: var(--tenue)"></p></div>' +
            '</div>' +
            '<div id="cpDesglose" class="sub-panel p-3 mt-4 text-[11px]" style="color: var(--gris)"></div>' +
            '<p class="text-[11px] mt-3" style="color: var(--tenue)">Planes activos: <b id="cpPlanesActivos">0</b>. Cada cobro que registres baja el saldo de esa venta.</p>' +
        '</div><div id="cpCobrosLista" class="space-y-3"></div>';

    function cuotaSiguiente(p) {
        if (p.saldo <= 0) return 0;
        if (p.cobros + 1 >= p.cuotas) return p.saldo;
        return r2(Math.min(p.cuotaSugerida, p.saldo));
    }

    // Lo que de verdad te queda: al monto que muestra Cashea se le descuenta su porcentaje
    function neto(n) { return r2((Number(n) || 0) * (1 - cfg.pct / 100)); }

    function cardCobro(p) {
        const t = tasa();
        const fecha = p.fecha ? new Date(p.fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }) : '';
        const liquidado = p.saldo <= 0;
        const pct = p.financiado > 0 ? Math.min(100, Math.round(p.cobradoUSD / p.financiado * 100)) : 100;
        const saldoNeto = neto(p.saldo);
        const comision = r2(p.saldo - saldoNeto);
        const chip = liquidado
            ? '<span class="chip chip-ok"><i class="fa-solid fa-check"></i> Liquidado</span>'
            : '<span class="chip chip-warn">' + p.cobros + ' de ' + p.cuotas + ' cuotas cobradas</span>';
        return '<div class="tarjeta p-4">' +
            '<div class="flex justify-between items-start gap-3 mb-2">' +
                '<div class="min-w-0"><p class="text-sm font-bold truncate">' + esc(p.cliente || 'Cliente') + '</p>' +
                '<p class="text-[11px]" style="color: var(--tenue)">' + esc(fecha) + ' · ' + esc(p.producto || '') + '</p>' +
                '<p class="text-[11px]" style="color: var(--tenue)">Inicial ' + usd(p.inicial) + ' · ' + p.cuotas + ' cuotas de ' + usd(p.cuotaSugerida) + '</p></div>' +
                '<div class="text-right flex-shrink-0"><span class="cifra-grande text-[22px] block">' + usd(saldoNeto) + '</span>' +
                (t ? '<span class="cifra text-[11px] block" style="color: var(--cyan)">' + bs(saldoNeto * t) + '</span>' : '') +
                '<span class="text-[9px] uppercase tracking-[0.16em] font-bold" style="color: var(--tenue)">te queda</span></div></div>' +
            (liquidado ? '' :
                '<p class="text-[11px] mb-2" style="color: var(--gris)">Cashea muestra <b>' + usd(p.saldo) + '</b> · comisión ' + esc(pctTxt()) + '%: <b>-' + usd(comision) + '</b></p>') +
            '<div class="flex justify-between items-center gap-2 mb-2">' + chip + '<span class="text-[11px] cifra" style="color: var(--gris)">Total venta ' + usd(p.total) + '</span></div>' +
            '<div style="height: 6px; border-radius: 9999px; background: var(--linea); overflow: hidden"><div style="height: 100%; width: ' + pct + '%; background: var(--fucsia)"></div></div>' +
            (liquidado ? '' :
                '<p class="text-[11px] mt-2" style="color: var(--gris)">Cuota de esta semana: <b>' + usd(neto(cuotaSiguiente(p))) + '</b> neto (Cashea muestra ' + usd(cuotaSiguiente(p)) + ')</p>' +
                '<button type="button" data-cobrar="' + esc(p.idVenta) + '" class="btn-marca w-full mt-3 py-2.5 rounded-full text-xs"><i class="fa-solid fa-hand-holding-dollar mr-1.5"></i> Registrar cobro de Cashea</button>') +
        '</div>';
    }

    function renderCobros() {
        const t = tasa();
        const activos = planes.filter(function (p) { return p.saldo > 0; });
        const bruto = r2(activos.reduce(function (s, p) { return s + p.saldo; }, 0));
        const totalNeto = r2(activos.reduce(function (s, p) { return s + neto(p.saldo); }, 0));
        const semBruto = r2(activos.reduce(function (s, p) { return s + cuotaSiguiente(p); }, 0));
        const semNeto = r2(activos.reduce(function (s, p) { return s + neto(cuotaSiguiente(p)); }, 0));
        $('cpTotalCobrar').textContent = usd(totalNeto);
        $('cpTotalCobrarBs').textContent = t ? bs(totalNeto * t) : '';
        $('cpCobroSemana').textContent = usd(semNeto);
        $('cpCobroSemanaBs').textContent = t ? bs(semNeto * t) : '';
        $('cpPlanesActivos').textContent = String(activos.length);
        $('cpDesglose').innerHTML = activos.length
            ? 'Cashea te muestra <b>' + usd(bruto) + '</b> · comisión del ' + esc(pctTxt()) + '%: <b>-' + usd(r2(bruto - totalNeto)) + '</b> · te queda <b>' + usd(totalNeto) + '</b>'
            : 'No hay saldo pendiente con Cashea.';
        $('cpCobrosLista').innerHTML = planes.length ? planes.map(cardCobro).join('') : '<p class="vacio">Todavía no hay ventas con plan Cashea.</p>';
    }

    function cargarPlanes() {
        return servidor('cashea_planes').then((d) => { planes = d.planes || []; renderCobros(); })
            .catch((e) => { $('cpCobrosLista').innerHTML = '<p class="aviso-error">' + esc(e.message) + '</p>'; });
    }

    function cobrar(idVenta) { // [VS] cobro por cuotas
        const p = planes.find((x) => x.idVenta === idVenta);
        if (!p) return;
        const restantes = Math.max(1, (Number(p.cuotas) || 1) - (Number(p.cobros) || 0));
        const montoDe = (n) => (n >= restantes ? r2(p.saldo) : r2(Math.min(p.cuotaSugerida * n, p.saldo)));
        const opciones = [];
        for (let n = 1; n <= restantes; n++) {
            opciones.push('   ' + n + (n === 1 ? ' cuota  = ' : ' cuotas = ') + usd(montoDe(n)) + ' (te quedan ' + usd(neto(montoDe(n))) + ')' + (n === restantes ? '  (liquida el plan)' : ''));
        }
        const entrada = prompt(
            '¿A cuántas cuotas te pagó Cashea?\n' +
            'Escribe un número del 1 al ' + restantes + ':\n\n' + opciones.join('\n'),
            '1'
        );
        if (entrada === null) return;
        const n = parseInt(String(entrada).trim(), 10);
        if (!(n >= 1 && n <= restantes)) { alert('Escribe un número del 1 al ' + restantes + '.'); return; }
        servidor('cashea_cobro', { idVenta: idVenta, cuotas: n, nota: '' })
            .then((d) => {
                alert('Cobro registrado: ' + n + (n === 1 ? ' cuota' : ' cuotas') + ' (' + usd(d.cobrado != null ? d.cobrado : montoDe(n)) + ').\nSaldo pendiente: ' + usd(d.saldoPendiente));
                return cargarPlanes();
            })
            .catch((e) => alert('No se pudo registrar: ' + e.message));
    }

    /* ======================================================================
       10. ARRANQUE (un solo lugar, en orden)
       ====================================================================== */
    // Las pantallas que ya existían se sacan del panel para que nada de la portada se les cuele
    ['formularioFisica', 'formularioQR', 'pantallaVersion'].forEach((id) => { const e = $(id); if (e) document.body.appendChild(e); });
    const acciones = $('accionesV'); if (acciones && acciones.parentNode) acciones.parentNode.removeChild(acciones);

    MODULOS.forEach((m) => crearPantalla(m.k, m.titulo, m.refresco, m.nodos));
    crearPantalla('precios', 'Lista de precios', true, HTML_PRECIOS);
    crearPantalla('cobros', 'Cobros Cashea', true, HTML_COBROS);

    $('csPct').value = cfg.pct;
    $('csModo').value = cfg.modo;
    $('csCats').addEventListener('click', (e) => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        catActiva = b.getAttribute('data-cat');
        renderPrecios();
    });
    $('cpCobrosLista').addEventListener('click', (e) => {
        const b = e.target.closest('[data-cobrar]');
        if (b) cobrar(b.getAttribute('data-cobrar'));
    });

    construirMenu();
    armarEncabezado();
    inyectarMetodoCashea();
    montarVenta();
    renderPrecios();
    pintarAviso();
    renderPlan();
    latir();
    setInterval(latir, 2000);
    setInterval(() => { const s = $('vs-precios'); if (s && s.classList.contains('abierta')) renderPrecios(); }, 20000);
    console.log('[VS] panel ordenado y activo');
})(window.VS_LOGO_B64);
