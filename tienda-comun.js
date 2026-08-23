// Lógica compartida entre index.html y catalogo.html: carrito (localStorage),
// mini-carrito flotante y modal de detalle/agregar al carrito.
//
// Antes esta lógica estaba duplicada por completo en ambos archivos, así que
// cada arreglo (ej. el bug de la burbuja del mini-carrito) había que aplicarlo
// dos veces. Ahora vive acá una sola vez; cada página solo agrega su propio
// código de listado (destacados con pestañas en index.html, grid con filtros
// en catalogo.html) en su <script> propio, que se carga después de este.

const WHATSAPP_PEDIDOS = "584245939407";
let productos = [];
let productoActual = null;
let imagenesProductoActual = [];
let precioUnitarioActual = 0;
let cantidadActual = 1;
let stockActual = 99;

// ---------- CARRITO (localStorage, compartido entre páginas) ----------
const CARRITO_KEY = 'vs_carrito';

function obtenerCarrito() {
    try { return JSON.parse(localStorage.getItem(CARRITO_KEY)) || []; } catch (e) { return []; }
}
function guardarCarrito(carrito) {
    localStorage.setItem(CARRITO_KEY, JSON.stringify(carrito));
    actualizarContadorCarrito();
}

// Si el cliente tiene el sitio abierto en varias pestañas (ej. compró en una y
// sigue viendo el catálogo en otra), el carrito de esa otra pestaña queda
// "congelado" con datos viejos hasta que algo lo refresque -- y si en ese
// momento resulta que el carrito real ya quedó vacío, se veía como si el
// carrito completo desapareciera sin avisar. Este listener mantiene el
// contador y el mini-carrito de cada pestaña sincronizados con lo que pase en
// las demás.
window.addEventListener('storage', (evento) => {
    if (evento.key !== CARRITO_KEY) return;
    actualizarContadorCarrito();
    const confirmacion = document.getElementById('detalleConfirmacion');
    if (confirmacion && !confirmacion.classList.contains('hidden')) renderizarMiniCarrito();
    const burbuja = document.getElementById('miniCarritoBurbuja');
    if (burbuja && !burbuja.classList.contains('hidden')) actualizarBurbujaCarrito();
});

const ULTIMO_PEDIDO_KEY = 'vs_ultimo_pedido';

function actualizarIndicadorPedido() {
    const punto = document.getElementById('puntoMiPedido');
    if (!punto) return;
    punto.classList.toggle('hidden', !localStorage.getItem(ULTIMO_PEDIDO_KEY));
}

function actualizarContadorCarrito() {
    const carrito = obtenerCarrito();
    const totalItems = carrito.reduce((sum, it) => sum + (it.cantidad || 1), 0);
    const badge = document.getElementById('contadorCarrito');
    if (!badge) return;
    if (totalItems > 0) { badge.textContent = totalItems > 99 ? '99+' : totalItems; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
}
function agregarAlCarrito(item) {
    const carrito = obtenerCarrito();
    const idx = carrito.findIndex(it => it.nombre === item.nombre && (it.color || '') === (item.color || '') && (it.talla || '') === (item.talla || ''));
    if (idx >= 0) carrito[idx].cantidad += item.cantidad;
    else carrito.push(item);
    guardarCarrito(carrito);
}

// A partir de 3 piezas en el carrito (sin importar el modelo), cada
// prenda tiene $1 de descuento -- misma regla que en carrito.html.
const UMBRAL_MAYOR = 3;
const DESCUENTO_MAYOR_UNITARIO = 1;

function obtenerCantidadTotalCarritoGlobal() {
    return obtenerCarrito().reduce((sum, it) => sum + (it.cantidad || 0), 0);
}

function obtenerDescuentoUnitarioGlobal() {
    return obtenerCantidadTotalCarritoGlobal() >= UMBRAL_MAYOR ? DESCUENTO_MAYOR_UNITARIO : 0;
}

function renderizarMiniCarrito() {
    const carrito = obtenerCarrito();
    const lista = document.getElementById('miniCarritoLista');
    if (!lista) return;

    if (!carrito.length) { ocultarConfirmacion(); return; }

    const descuento = obtenerDescuentoUnitarioGlobal();
    let total = 0;

    lista.innerHTML = carrito.map(it => {
        const precioFinal = Math.max(0, it.precio - descuento);
        total += precioFinal * it.cantidad;
        return `
            <div class="flex items-center gap-3 px-4 py-3">
                <img src="${escapeHTML(it.imagen || 'imagenes/logo.jpg')}" class="w-12 h-12 rounded-lg object-contain bg-gray-50 shrink-0" onerror="this.src='imagenes/logo.jpg'">
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-gray-900 truncate">${escapeHTML(it.nombre)}</p>
                    <p class="text-[10px] text-gray-400 truncate">${it.color ? escapeHTML(it.color) : ''}${it.talla ? ' · Talla ' + escapeHTML(it.talla) : ''}</p>
                    <div class="inline-flex items-center border border-gray-200 rounded-full mt-1">
                        <button type="button" onclick="miniCambiarCantidad('${escapeJS(it.nombre)}', '${escapeJS(it.color || '')}', '${escapeJS(it.talla || '')}', -1)" class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-900 text-xs">−</button>
                        <span class="w-5 text-center text-[11px] font-semibold">${it.cantidad}</span>
                        <button type="button" onclick="miniCambiarCantidad('${escapeJS(it.nombre)}', '${escapeJS(it.color || '')}', '${escapeJS(it.talla || '')}', 1)" class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-900 text-xs">+</button>
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <p class="text-xs font-bold text-gray-900">$${(precioFinal * it.cantidad).toFixed(2)}</p>
                    <button type="button" onclick="miniQuitar('${escapeJS(it.nombre)}', '${escapeJS(it.color || '')}', '${escapeJS(it.talla || '')}')" class="text-[10px] text-gray-400 hover:text-rose-500 mt-1">Quitar</button>
                </div>
            </div>`;
    }).join('');

    const totalPiezas = obtenerCantidadTotalCarritoGlobal();
    const cabecera = document.getElementById('detalleConfirmacionCantidad');
    if (cabecera) cabecera.textContent = 'Tu carrito · ' + totalPiezas + (totalPiezas === 1 ? ' pieza' : ' piezas');
    const totalEl = document.getElementById('miniCarritoTotal');
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
}

function miniCambiarCantidad(nombre, color, talla, delta) {
    const carrito = obtenerCarrito();
    const item = carrito.find(it => it.nombre === nombre && (it.color || '') === (color || '') && (it.talla || '') === (talla || ''));
    if (!item) return;
    item.cantidad = Math.max(1, item.cantidad + delta);
    guardarCarrito(carrito);
    renderizarMiniCarrito();
    if (confirmacionTimeoutId) clearTimeout(confirmacionTimeoutId);
    confirmacionTimeoutId = setTimeout(minimizarConfirmacion, 6000);
    if (productoActual && productoActual.nombre === nombre) {
        actualizarBadgeColor(color);
        actualizarEstadoCompra();
    }
}

function miniQuitar(nombre, color, talla) {
    const carrito = obtenerCarrito().filter(it => !(it.nombre === nombre && (it.color || '') === (color || '') && (it.talla || '') === (talla || '')));
    guardarCarrito(carrito);
    renderizarMiniCarrito();
    if (confirmacionTimeoutId) clearTimeout(confirmacionTimeoutId);
    confirmacionTimeoutId = setTimeout(minimizarConfirmacion, 6000);
    if (productoActual && productoActual.nombre === nombre) {
        actualizarBadgeColor(color);
        actualizarEstadoCompra();
    }
}

function cambiarCantidad(delta) {
    const restante = obtenerStockRestanteActual();
    cantidadActual = restante <= 0 ? 0 : Math.max(1, Math.min(restante, cantidadActual + delta));
    document.getElementById('detalleCantidad').textContent = cantidadActual;
    document.getElementById('detallePrecio').textContent = '$' + (precioUnitarioActual * cantidadActual).toFixed(2);
    ocultarPanelSiAbierto();
    actualizarEstadoCompra();
}

let confirmacionTimeoutId = null;
let miniCarritoMinimizado = false;

// Oculta todo (panel Y burbuja) -- solo se usa cuando el carrito queda vacío.
function ocultarConfirmacion() {
    const confirmacion = document.getElementById('detalleConfirmacion');
    const burbuja = document.getElementById('miniCarritoBurbuja');
    if (confirmacion) confirmacion.classList.add('hidden');
    if (burbuja) burbuja.classList.add('hidden');
    if (confirmacionTimeoutId) { clearTimeout(confirmacionTimeoutId); confirmacionTimeoutId = null; }
    miniCarritoMinimizado = false;
}

function actualizarBurbujaCarrito() {
    const burbuja = document.getElementById('miniCarritoBurbuja');
    if (!burbuja) return;
    const totalPiezas = obtenerCantidadTotalCarritoGlobal();
    if (totalPiezas <= 0) { burbuja.classList.add('hidden'); return; }
    const contador = document.getElementById('miniCarritoBurbujaContador');
    if (contador) contador.textContent = totalPiezas > 99 ? '99+' : totalPiezas;
    burbuja.classList.remove('hidden');
}

// Achica el panel a una burbuja pequeña, para no taparle la vista al
// cliente ni perder el acceso al carrito.
function minimizarConfirmacion() {
    const confirmacion = document.getElementById('detalleConfirmacion');
    if (confirmacion) confirmacion.classList.add('hidden');
    if (confirmacionTimeoutId) { clearTimeout(confirmacionTimeoutId); confirmacionTimeoutId = null; }
    miniCarritoMinimizado = true;
    actualizarBurbujaCarrito();
}

// Se usa cuando el cliente cambia de color/talla/cantidad -- solo cierra el
// panel grande si estaba abierto (porque ya no aplica a lo que va a agregar
// ahora), pero NUNCA toca la burbuja minimizada ni borra su estado.
function ocultarPanelSiAbierto() {
    const confirmacion = document.getElementById('detalleConfirmacion');
    if (!confirmacion || confirmacion.classList.contains('hidden')) return;
    confirmacion.classList.add('hidden');
    if (confirmacionTimeoutId) { clearTimeout(confirmacionTimeoutId); confirmacionTimeoutId = null; }
    if (obtenerCantidadTotalCarritoGlobal() > 0) {
        miniCarritoMinimizado = true;
        actualizarBurbujaCarrito();
    }
}

function expandirConfirmacion() {
    miniCarritoMinimizado = false;
    const burbuja = document.getElementById('miniCarritoBurbuja');
    if (burbuja) burbuja.classList.add('hidden');
    mostrarConfirmacion();
}

// ---------- ARRASTRAR LA BURBUJA DEL MINI-CARRITO ----------
// El cliente puede arrastrarla a cualquier parte de la pantalla (por si le
// tapa algo que quiere ver). Un simple toque/clic (sin arrastrar) sigue
// abriendo el carrito como antes.
(function habilitarArrastreBurbuja() {
    const burbuja = document.getElementById('miniCarritoBurbuja');
    if (!burbuja || !window.PointerEvent) return;

    let arrastrando = false;
    let seMovio = false;
    let offsetX = 0, offsetY = 0;
    let inicioX = 0, inicioY = 0;
    const UMBRAL_ARRASTRE = 6; // px de distancia total desde el toque inicial para contar como arrastre

    burbuja.addEventListener('pointerdown', (e) => {
        arrastrando = true;
        seMovio = false;
        inicioX = e.clientX;
        inicioY = e.clientY;
        burbuja.setPointerCapture(e.pointerId);
        const rect = burbuja.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        // A partir de aquí se posiciona por left/top; se abandona right/top-20 (Tailwind).
        burbuja.style.right = 'auto';
        burbuja.style.left = rect.left + 'px';
        burbuja.style.top = rect.top + 'px';
    });

    burbuja.addEventListener('pointermove', (e) => {
        if (!arrastrando) return;
        if (Math.abs(e.clientX - inicioX) > UMBRAL_ARRASTRE || Math.abs(e.clientY - inicioY) > UMBRAL_ARRASTRE) seMovio = true;

        const nuevoX = Math.max(4, Math.min(window.innerWidth - burbuja.offsetWidth - 4, e.clientX - offsetX));
        const nuevoY = Math.max(4, Math.min(window.innerHeight - burbuja.offsetHeight - 4, e.clientY - offsetY));
        burbuja.style.left = nuevoX + 'px';
        burbuja.style.top = nuevoY + 'px';
    });

    function soltar(e) {
        if (!arrastrando) return;
        arrastrando = false;
        try { burbuja.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    burbuja.addEventListener('pointerup', soltar);
    burbuja.addEventListener('pointercancel', soltar);

    burbuja.addEventListener('click', (e) => {
        if (seMovio) { e.preventDefault(); e.stopPropagation(); seMovio = false; return; }
        expandirConfirmacion();
    });
})();

// Se llama cada vez que se agrega algo. Si el cliente ya lo había
// minimizado a propósito, no se le vuelve a abrir encima -- solo se
// actualiza el numerito de la burbuja.
function mostrarConfirmacion() {
    renderizarMiniCarrito();
    if (miniCarritoMinimizado) { actualizarBurbujaCarrito(); return; }

    const confirmacion = document.getElementById('detalleConfirmacion');
    if (!confirmacion) return;
    const burbuja = document.getElementById('miniCarritoBurbuja');
    if (burbuja) burbuja.classList.add('hidden');
    confirmacion.classList.remove('hidden');
    if (confirmacionTimeoutId) clearTimeout(confirmacionTimeoutId);
    confirmacionTimeoutId = setTimeout(minimizarConfirmacion, 6000);
}

function seleccionarColor(color, chipClickeado, indice) {
    ocultarPanelSiAbierto();
    if (productoActual) productoActual.color = color;
    document.querySelectorAll('#detalleColores .color-chip').forEach(chip => {
        chip.classList.remove('bg-gray-900', 'border-gray-900', 'text-white');
        chip.classList.add('bg-gray-50', 'border-gray-200', 'text-gray-700');
    });
    chipClickeado.classList.remove('bg-gray-50', 'border-gray-200', 'text-gray-700');
    chipClickeado.classList.add('bg-gray-900', 'border-gray-900', 'text-white');

    // Si hay una foto guardada en el mismo orden que este color, la mostramos.
    if (typeof indice === 'number' && imagenesProductoActual[indice]) {
        const img = imagenesProductoActual[indice];
        document.getElementById('detalleImagen').src = img;
        if (productoActual) productoActual.imagen = img;
        document.querySelectorAll('#detalleGaleria button').forEach((btn, i) => {
            btn.classList.toggle('border-cyan-400', i === indice);
            btn.classList.toggle('border-gray-200', i !== indice);
        });
    }

    actualizarTrasCambiarSeleccion();
}

function seleccionarTalla(talla, chipClickeado) {
    ocultarPanelSiAbierto();
    if (productoActual) productoActual.talla = talla;
    document.querySelectorAll('#detalleTallas .talla-chip').forEach(chip => {
        chip.classList.remove('bg-gray-900', 'border-gray-900', 'text-white');
        chip.classList.add('bg-gray-50', 'border-gray-200', 'text-gray-700');
    });
    chipClickeado.classList.remove('bg-gray-50', 'border-gray-200', 'text-gray-700');
    chipClickeado.classList.add('bg-gray-900', 'border-gray-900', 'text-white');

    actualizarTrasCambiarSeleccion();
}

// Cada combinación de color (y talla, si aplica) puede tener su propio
// stock restante, así que al cambiar cualquiera de las dos hay que
// recalcular la cantidad y el mensaje de stock -- si no, se quedan
// pegados con los de la selección anterior.
function actualizarTrasCambiarSeleccion() {
    const restante = obtenerStockRestanteActual();
    cantidadActual = restante <= 0 ? 0 : 1;
    const spanCantidad = document.getElementById('detalleCantidad');
    if (spanCantidad) spanCantidad.textContent = cantidadActual;
    document.getElementById('detallePrecio').textContent = '$' + (precioUnitarioActual * cantidadActual).toFixed(2);
    actualizarEstadoCompra();
}

function obtenerCantidadColorEnCarrito(nombre, color) {
    const item = obtenerCarrito().find(it => it.nombre === nombre && (it.color || '') === (color || ''));
    return item ? item.cantidad : 0;
}

function obtenerCantidadVarianteEnCarrito(nombre, color, talla) {
    const item = obtenerCarrito().find(it => it.nombre === nombre && (it.color || '') === (color || '') && (it.talla || '') === (talla || ''));
    return item ? item.cantidad : 0;
}

function actualizarBadgeColor(color) {
    if (!productoActual) return;
    const cantidad = obtenerCantidadColorEnCarrito(productoActual.nombre, color);
    document.querySelectorAll('#detalleColores .color-chip').forEach(chip => {
        if (chip.dataset.color !== color) return;
        const contador = chip.querySelector('.color-add-count');
        if (contador) {
            contador.textContent = cantidad;
            contador.classList.toggle('hidden', cantidad <= 0);
        }
        const botonQuitar = chip.querySelector('.color-remove-btn');
        if (botonQuitar) botonQuitar.classList.toggle('hidden', cantidad <= 0);
    });
}

function obtenerCantidadTotalEnCarrito(nombre) {
    return obtenerCarrito().filter(it => it.nombre === nombre).reduce((sum, it) => sum + (it.cantidad || 0), 0);
}

// Convierte "Rojo:5, Azul Cielo:40" en { rojo: {nombreOriginal, cantidad}, ... }.
function parsearStockColores(texto) {
    const mapa = {};
    if (!texto || !texto.trim()) return mapa;
    texto.split(',').forEach(par => {
        const partes = par.split(':');
        if (partes.length !== 2) return;
        const nombre = partes[0].trim();
        const cantidad = parseInt(partes[1].trim(), 10);
        if (nombre && !isNaN(cantidad)) mapa[nombre.toLowerCase()] = { nombreOriginal: nombre, cantidad: cantidad };
    });
    return mapa;
}

// Convierte "Rojo|M:5, Rojo|L:3, Azul|M:10" en { 'rojo|m': {colorOriginal, tallaOriginal, cantidad}, ... }.
function parsearStockVariantes(texto) {
    const mapa = {};
    if (!texto || !texto.trim()) return mapa;
    texto.split(',').forEach(par => {
        const partes = par.split(':');
        if (partes.length !== 2) return;
        const cantidad = parseInt(partes[1].trim(), 10);
        if (isNaN(cantidad)) return;
        const mitades = partes[0].split('|');
        if (mitades.length !== 2) return;
        const color = mitades[0].trim();
        const talla = mitades[1].trim();
        if (!color || !talla) return;
        mapa[color.toLowerCase() + '|' + talla.toLowerCase()] = { colorOriginal: color, tallaOriginal: talla, cantidad: cantidad };
    });
    return mapa;
}

// Si el producto tiene stock cargado por color, usa ese número para ese color en particular.
// Si no, cae al stock total del producto repartido entre todos los colores (comportamiento anterior).
function obtenerStockRestantePorColor(color) {
    if (!productoActual) return stockActual;
    const mapa = productoActual.stockColores || {};
    const key = (color || '').toLowerCase();
    if (key && Object.prototype.hasOwnProperty.call(mapa, key)) {
        const enCarritoColor = obtenerCantidadColorEnCarrito(productoActual.nombre, color);
        return Math.max(0, mapa[key].cantidad - enCarritoColor);
    }
    return Math.max(0, stockActual - obtenerCantidadTotalEnCarrito(productoActual.nombre));
}

// Si el producto tiene stock cargado por combinación color+talla, usa ese
// número. Si esa combinación en particular no está cargada, cae al stock
// del color solo (o al total, según lo que haya disponible).
function obtenerStockRestanteVariante(color, talla) {
    if (!productoActual) return stockActual;
    const mapa = productoActual.stockVariantes || {};
    const key = (color || '').toLowerCase() + '|' + (talla || '').toLowerCase();
    if (talla && Object.prototype.hasOwnProperty.call(mapa, key)) {
        const enCarrito = obtenerCantidadVarianteEnCarrito(productoActual.nombre, color, talla);
        return Math.max(0, mapa[key].cantidad - enCarrito);
    }
    return obtenerStockRestantePorColor(color);
}

function obtenerStockRestanteActual() {
    if (!productoActual) return stockActual;
    if (productoActual.tieneTallas) return obtenerStockRestanteVariante(productoActual.color || '', productoActual.talla || '');
    return obtenerStockRestantePorColor(productoActual.color || '');
}

// Actualiza en vivo el texto de stock disponible y bloquea los botones de compra si ya no queda stock.
function actualizarEstadoCompra() {
    if (!productoActual) return;
    const colorActivo = productoActual.color || '';
    const tallaActiva = productoActual.talla || '';
    const tieneTallas = !!productoActual.tieneTallas;
    const tieneStockPorColor = productoActual.stockColores && Object.keys(productoActual.stockColores).length > 0;
    const restante = obtenerStockRestanteActual();
    const sinStock = restante <= 0;

    if (cantidadActual > restante) {
        cantidadActual = restante;
        const spanCantidad = document.getElementById('detalleCantidad');
        if (spanCantidad) spanCantidad.textContent = cantidadActual;
        document.getElementById('detallePrecio').textContent = '$' + (precioUnitarioActual * cantidadActual).toFixed(2);
    }

    const spanStock = document.getElementById('detalleStock');
    if (spanStock) {
        if (tieneTallas) {
            const etiqueta = colorActivo && tallaActiva ? (colorActivo + ' / Talla ' + tallaActiva) : (tallaActiva ? 'Talla ' + tallaActiva : colorActivo);
            spanStock.textContent = sinStock ? 'Sin stock disponible en ' + etiqueta : 'Quedan ' + restante + ' disponibles en ' + etiqueta;
        } else if (tieneStockPorColor) {
            spanStock.textContent = sinStock ? 'Sin stock disponible en ' + colorActivo : 'Quedan ' + restante + ' disponibles en ' + colorActivo;
        } else if (stockActual <= 99) {
            spanStock.textContent = sinStock ? 'Sin stock disponible' : 'Quedan ' + restante + ' disponibles';
        } else {
            spanStock.textContent = '';
        }
        spanStock.classList.toggle('text-red-500', sinStock);
        spanStock.classList.toggle('font-semibold', sinStock);
        spanStock.classList.toggle('text-gray-400', !sinStock);
    }

    const btnCarrito = document.getElementById('detalleBotonCarrito');
    if (btnCarrito && !btnCarrito.classList.contains('hidden')) {
        btnCarrito.disabled = sinStock;
        btnCarrito.classList.toggle('opacity-40', sinStock);
        btnCarrito.classList.toggle('cursor-not-allowed', sinStock);
    }

    const btnCantidadMas = document.getElementById('btnCantidadMas');
    if (btnCantidadMas) {
        const alTope = sinStock || cantidadActual >= restante;
        btnCantidadMas.disabled = alTope;
        btnCantidadMas.classList.toggle('opacity-30', alTope);
        btnCantidadMas.classList.toggle('cursor-not-allowed', alTope);
    }

    if (tieneTallas) {
        // Con tallas, cada chip de color/talla solo se marca como agotado
        // (atenuado) según la combinación con la otra selección activa --
        // no hay botones de agregar rápido, así que no hace falta más.
        document.querySelectorAll('#detalleColores .color-chip').forEach(chip => {
            const sinStockCombo = tallaActiva && obtenerStockRestanteVariante(chip.dataset.color, tallaActiva) <= 0;
            chip.classList.toggle('opacity-40', !!sinStockCombo);
        });
        document.querySelectorAll('#detalleTallas .talla-chip').forEach(chip => {
            const sinStockCombo = colorActivo && obtenerStockRestanteVariante(colorActivo, chip.dataset.talla) <= 0;
            chip.classList.toggle('opacity-40', !!sinStockCombo);
        });
    } else {
        // Sin tallas: cada color se bloquea de forma independiente, según su propio stock restante.
        document.querySelectorAll('#detalleColores .color-chip').forEach(chip => {
            const btnMas = chip.querySelector('.color-add-btn');
            if (!btnMas) return;
            const sinStockChip = obtenerStockRestantePorColor(chip.dataset.color) <= 0;
            btnMas.classList.toggle('opacity-30', sinStockChip);
            btnMas.classList.toggle('pointer-events-none', sinStockChip);
        });
    }
}

// Agrega 1 unidad de este color directamente, sin pasar por el selector de cantidad.
function agregarColorRapido(color, indice, botonClickeado) {
    if (!productoActual || obtenerStockRestantePorColor(color) <= 0) return;
    const imagenColor = (typeof indice === 'number' && imagenesProductoActual[indice]) ? imagenesProductoActual[indice] : productoActual.imagen;
    agregarAlCarrito({
        nombre: productoActual.nombre,
        precio: precioUnitarioActual,
        categoria: productoActual.categoria,
        imagen: imagenColor,
        color: color,
        cantidad: 1
    });
    actualizarBadgeColor(color);
    actualizarEstadoCompra();
    mostrarConfirmacion();

    const icono = botonClickeado.querySelector('.color-add-icon');
    botonClickeado.classList.add('bg-emerald-500', 'text-white');
    if (icono) icono.innerHTML = '<i class="fa-solid fa-check"></i>';

    setTimeout(() => {
        botonClickeado.classList.remove('bg-emerald-500', 'text-white');
        if (icono) icono.textContent = '+';
    }, 700);
}

// Quita 1 unidad de este color del carrito, sin salir del modal.
function quitarColorRapido(color) {
    if (!productoActual) return;
    const carrito = obtenerCarrito();
    const idx = carrito.findIndex(it => it.nombre === productoActual.nombre && (it.color || '') === (color || ''));
    if (idx === -1) return;
    carrito[idx].cantidad -= 1;
    if (carrito[idx].cantidad <= 0) carrito.splice(idx, 1);
    guardarCarrito(carrito);
    actualizarBadgeColor(color);
    actualizarEstadoCompra();
}

function agregarAlCarritoDesdeModal() {
    if (!productoActual) return;
    const cantidadAAgregar = Math.min(cantidadActual, obtenerStockRestanteActual());
    if (cantidadAAgregar <= 0) return;
    agregarAlCarrito({
        nombre: productoActual.nombre,
        precio: precioUnitarioActual,
        categoria: productoActual.categoria,
        imagen: productoActual.imagen,
        color: productoActual.color || '',
        talla: productoActual.talla || '',
        cantidad: cantidadAAgregar
    });
    mostrarConfirmacion();
    actualizarBadgeColor(productoActual.color || '');
    cantidadActual = obtenerStockRestanteActual() <= 0 ? 0 : 1;
    const spanCantidad = document.getElementById('detalleCantidad');
    if (spanCantidad) spanCantidad.textContent = cantidadActual;
    document.getElementById('detallePrecio').textContent = '$' + (precioUnitarioActual * cantidadActual).toFixed(2);
    actualizarEstadoCompra();
}

// ---------- BIENVENIDA (solo la primera vez que alguien visita el sitio) ----------

const BIENVENIDA_KEY = 'vs_bienvenida_vista';

function mostrarBienvenidaSiEsNuevo() {
    if (localStorage.getItem(BIENVENIDA_KEY)) return;
    localStorage.setItem(BIENVENIDA_KEY, '1');
    const toast = document.getElementById('bienvenidaToast');
    if (!toast) return;
    toast.classList.remove('hidden');
    setTimeout(ocultarBienvenida, 7000);
}

function ocultarBienvenida() {
    const toast = document.getElementById('bienvenidaToast');
    if (toast) toast.classList.add('hidden');
}

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

function escapeJS(str) { return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function escapeHTML(str) { const div = document.createElement('div'); div.textContent = str == null ? '' : String(str); return div.innerHTML; }

function obtenerListaImagenes(textoImagen) {
    if (!textoImagen || !textoImagen.trim()) return ['imagenes/logo.jpg'];
    const lista = textoImagen.split('|').map(s => s.trim()).filter(Boolean);
    return lista.length ? lista : ['imagenes/logo.jpg'];
}

function normalizarCategoria(cat) {
    const limpio = (cat || '').trim();
    if (!limpio) return null;
    if (limpio.toLowerCase() === 'revisar' || limpio.toLowerCase() === 'combos' || limpio.toLowerCase() === 'combo') return null;
    return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

// ---------- MODAL DETALLE / CARRITO ----------

function renderizarGaleria(listaImagenes) {
    const cont = document.getElementById('detalleGaleria');
    if (!cont) return;
    if (!listaImagenes || listaImagenes.length <= 1) { cont.classList.add('hidden'); cont.innerHTML = ''; return; }
    cont.classList.remove('hidden');
    cont.innerHTML = listaImagenes.map((img, i) => `
        <button onclick="cambiarImagenDetalle('${escapeJS(img)}', this)" class="icon-btn w-14 h-14 shrink-0 rounded-lg overflow-hidden border-2 ${i === 0 ? 'border-cyan-400' : 'border-gray-200'}">
            <img src="${escapeHTML(img)}" class="w-full h-full object-cover" onerror="this.src='imagenes/logo.jpg'">
        </button>
    `).join('');
}

function cambiarImagenDetalle(url, btnClickeado) {
    document.getElementById('detalleImagen').src = url;
    document.querySelectorAll('#detalleGaleria button').forEach(btn => { btn.classList.remove('border-cyan-400'); btn.classList.add('border-gray-200'); });
    btnClickeado.classList.remove('border-gray-200');
    btnClickeado.classList.add('border-cyan-400');
}

function abrirDetalle(nombre, textoImagen, precioFormateado, categoriaLabel, coloresTexto, disponible, stock, stockColoresTexto, tallasTexto, stockVariantesTexto) {
    let mensajeWhatsApp = encodeURIComponent("¡Hola Valera Sport! Me interesa consultar por: " + nombre + " ($" + precioFormateado + ")");
    let enlaceWhatsApp = "https://wa.me/" + WHATSAPP_PEDIDOS + "?text=" + mensajeWhatsApp;
    stockActual = (typeof stock === 'number' && stock > 0) ? stock : 99;

    const listaImagenes = obtenerListaImagenes(textoImagen);
    imagenesProductoActual = listaImagenes;
    const listaTallas = (tallasTexto || '').split(',').map(t => t.trim()).filter(Boolean);
    productoActual = {
        nombre: nombre, categoria: categoriaLabel, imagen: listaImagenes[0],
        color: '', talla: '', tieneTallas: listaTallas.length > 0,
        stockColores: parsearStockColores(stockColoresTexto),
        stockVariantes: parsearStockVariantes(stockVariantesTexto)
    };
    precioUnitarioActual = parseFloat(precioFormateado) || 0;
    cantidadActual = 1;
    const spanCantidad = document.getElementById('detalleCantidad');
    if (spanCantidad) spanCantidad.textContent = '1';

    const btnCarrito = document.getElementById('detalleBotonCarrito');
    if (btnCarrito) {
        btnCarrito.classList.toggle('hidden', !disponible);
        btnCarrito.disabled = false;
    }
    // Antes esto escondia el mini-carrito a la fuerza (classList.add('hidden'))
    // sin pasar a la burbuja minimizada -- si el cliente tenia el panel abierto
    // y tocaba otro producto, el carrito "desaparecia" sin dejar ni el icono
    // flotante. ocultarPanelSiAbierto() sí lo minimiza a la burbuja si aún hay
    // algo en el carrito.
    ocultarPanelSiAbierto();

    document.getElementById('detalleImagen').src = listaImagenes[0];
    document.getElementById('detalleImagen').alt = nombre;
    renderizarGaleria(listaImagenes);
    document.getElementById('detalleCategoria').textContent = categoriaLabel;
    document.getElementById('detalleNombre').textContent = nombre;
    document.getElementById('detallePrecio').textContent = '$' + precioFormateado;

    const coloresContainer = document.getElementById('detalleColores');
    coloresContainer.innerHTML = "";
    const listaColores = coloresTexto.split(',').map(c => c.trim()).filter(Boolean);
    if (listaColores.length) {
        listaColores.forEach((color, i) => {
            const activo = i === 0;
            if (activo) productoActual.color = color;
            if (productoActual.tieneTallas) {
                // Con tallas, el color es solo selección: no tiene sentido un "+"
                // rápido de un color sin saber a qué talla corresponde.
                coloresContainer.innerHTML += `
                    <button type="button" onclick="seleccionarColor('${escapeJS(color)}', this, ${i})" data-color="${escapeHTML(color)}" class="color-chip px-3 py-1.5 rounded-full text-xs font-medium border transition ${activo ? 'bg-gray-900 border-gray-900 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-400'}">${escapeHTML(color)}</button>`;
            } else {
                const cantidadPrevia = obtenerCantidadColorEnCarrito(nombre, color);
                coloresContainer.innerHTML += `
                    <div class="color-chip inline-flex items-center rounded-full border text-xs font-medium transition ${activo ? 'bg-gray-900 border-gray-900 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-400'}" data-color="${escapeHTML(color)}">
                        <button type="button" onclick="seleccionarColor('${escapeJS(color)}', this.closest('.color-chip'), ${i})" class="rounded-l-full pl-3 pr-2 py-1.5">${escapeHTML(color)}</button>
                        <button type="button" onclick="quitarColorRapido('${escapeJS(color)}')" class="color-remove-btn w-6 h-6 flex items-center justify-center shrink-0 hover:bg-black/10 transition-colors font-bold text-sm leading-none ${cantidadPrevia > 0 ? '' : 'hidden'}" title="Quitar uno de ${escapeHTML(color)}">−</button>
                        <button type="button" onclick="agregarColorRapido('${escapeJS(color)}', ${i}, this)" class="color-add-btn relative rounded-r-full w-6 h-6 mr-0.5 flex items-center justify-center shrink-0 hover:bg-black/10 transition-colors" title="Agregar ${escapeHTML(color)} al carrito">
                            <span class="color-add-icon font-bold text-sm leading-none">+</span>
                            <span class="color-add-count ${cantidadPrevia > 0 ? '' : 'hidden'} absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">${cantidadPrevia}</span>
                        </button>
                    </div>`;
            }
        });
    } else {
        coloresContainer.innerHTML = '<span class="text-xs text-gray-400">Colores variados, consulta disponibilidad</span>';
    }

    const tallasContenedor = document.getElementById('detalleTallasContenedor');
    const tallasContainer = document.getElementById('detalleTallas');
    tallasContainer.innerHTML = '';
    if (listaTallas.length) {
        tallasContenedor.classList.remove('hidden');
        listaTallas.forEach((talla, i) => {
            const activo = i === 0;
            if (activo) productoActual.talla = talla;
            tallasContainer.innerHTML += `
                <button type="button" onclick="seleccionarTalla('${escapeJS(talla)}', this)" data-talla="${escapeHTML(talla)}" class="talla-chip px-3 py-1.5 rounded-full text-xs font-medium border transition ${activo ? 'bg-gray-900 border-gray-900 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-400'}">${escapeHTML(talla)}</button>`;
        });
    } else {
        tallasContenedor.classList.add('hidden');
    }

    const btnWA = document.getElementById('detalleBotonWA');
    const noDisp = document.getElementById('detalleNoDisponible');
    btnWA.href = enlaceWhatsApp;
    noDisp.classList.toggle('hidden', disponible);

    if (obtenerStockRestanteActual() <= 0) cantidadActual = 0;
    if (spanCantidad) spanCantidad.textContent = cantidadActual;
    actualizarEstadoCompra();

    const modal = document.getElementById('detalleModal');
    const container = document.getElementById('detalleModalContainer');
    modal.classList.remove('hidden');
    setTimeout(() => { container.classList.remove('scale-95', 'opacity-0'); }, 50);
}

function cerrarDetalle() {
    const container = document.getElementById('detalleModalContainer');
    container.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { document.getElementById('detalleModal').classList.add('hidden'); }, 200);
}

// ---------- CUENTA DE CLIENTE ----------

let usuarioActual = null;

function clicBotonCuenta() {
    if (usuarioActual) { window.location.href = 'cuenta.html'; return; }
    if (typeof window.firebaseSignIn !== 'function') { alert('El sistema de cuentas está cargando, intenta de nuevo en un segundo.'); return; }
    window.firebaseSignIn()
        .then(() => { window.location.href = 'cuenta.html'; })
        .catch((error) => { console.error(error); alert('No se pudo iniciar sesión: ' + error.message); });
}

window.addEventListener('firebase-auth-changed', (e) => {
    usuarioActual = e.detail.user;
    actualizarBotonCuenta();
});

function actualizarBotonCuenta() {
    const btn = document.getElementById('btnCuenta');
    if (!btn) return;
    if (usuarioActual) { btn.title = usuarioActual.email + ' — Ver mi cuenta'; btn.classList.add('text-cyan-500'); }
    else { btn.title = 'Iniciar sesión / Registrarse'; btn.classList.remove('text-cyan-500'); }
}
