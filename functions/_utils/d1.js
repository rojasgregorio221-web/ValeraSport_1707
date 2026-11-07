// D1-PATCH
// Lógica de negocio sobre D1 (reemplaza a Apps Script: misma lógica, mismos JSON).
// Sin KV: usa solo D1 y la caché de Cloudflare.

const OFFSET_MS = 4 * 3600 * 1000; // Caracas = UTC-4 (sin horario de verano)
const UMBRAL_VENTA_MAYOR = 3;
const DESCUENTO_MAYOR_UNITARIO = 1;
const MAX_ITEMS_PEDIDO = 30;
const MAX_CANTIDAD_ITEM = 20;
const METODOS_USD = ["efectivo usd", "zelle", "binance", "cashea usd"];
const CASHEA_LIMITE_TRES_CUOTAS = 100;
const CASHEA_DIAS_ENTRE_COBROS = 7;
const CLAVE_CACHE_CATALOGO = "https://www.valerasportvzla.com/__cache/productos-csv";
const CACHE_BASE = "https://valerasportvzla.com/__cache/";
const PALABRAS_PRIVADAS = ["costo", "ganancia", "margen", "utilidad", "proveedor", "porcentaje", "%", "interno", "privado", "compra"];

export class ErrorHttp extends Error {
  constructor(mensaje, status) { super(mensaje); this.status = status; }
}

export function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// ---------- utilidades ----------
const ahora = () => new Date().toISOString();
export function hoyVzla() { return new Date(Date.now() - OFFSET_MS).toISOString().slice(0, 10); }
function sumarDias(ymd, n) {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function inicioSemana(ymd) {
  const d = new Date(ymd + "T12:00:00Z");
  return sumarDias(ymd, -((d.getUTCDay() + 6) % 7));
}
const inicioDia = (ymd) => ymd + "T04:00:00.000Z";

function limpiar(v, max) {
  let s = (v === null || v === undefined ? "" : String(v)).trim();
  if (max) s = s.slice(0, max);
  return s;
}
function entero(v, min, max, defecto) {
  let n = parseInt(v, 10);
  if (isNaN(n)) n = defecto;
  return Math.min(max, Math.max(min, n));
}
function dinero(v) {
  const n = parseFloat(v);
  if (isNaN(n) || !isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}
const redondear2 = (n) => Math.round(n * 100) / 100;
const uuid8 = () => crypto.randomUUID().slice(0, 8).toUpperCase();
const bsDe = (usd, tasa) => (tasa ? Math.round(usd * tasa * 100) / 100 : null);
const normalizar = (t) => String(t || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const clave = (t) => String(t || "").trim().toLowerCase();

function iguales(a, b) {
  const largo = Math.max(a.length, b.length);
  let r = a.length ^ b.length;
  for (let i = 0; i < largo; i++) r |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return r === 0;
}

function lineaNombre(it) {
  return it.producto + (it.color ? " - " + it.color : "") + (it.talla ? " · Talla " + it.talla : "") + (it.cantidad > 1 ? " (x" + it.cantidad + ")" : "");
}

// Línea de pedido -> producto base, color, talla y cantidad (sirve para líneas nuevas y migradas del Sheet).
function descomponer(it) {
  const p = String(it.producto || "");
  if (/\(x\d+\)$/.test(p) || p.indexOf(" · Talla ") !== -1) {
    const mc = p.match(/\(x(\d+)\)$/);
    const sinC = p.replace(/\s*\(x\d+\)$/, "").trim();
    let talla = "", sinT = sinC;
    const mt = sinC.match(/^(.*?)\s·\sTalla\s(.+)$/);
    if (mt) { sinT = mt[1].trim(); talla = mt[2].trim(); }
    const mcol = sinT.match(/^(.*?)\s-\s([^-]+)$/);
    return { base: clave(mcol ? mcol[1] : sinT), color: mcol ? mcol[2].trim() : "", talla, cantidad: mc ? parseInt(mc[1], 10) : 1 };
  }
  return { base: clave(p), color: it.color || "", talla: it.talla || "", cantidad: parseInt(it.cantidad, 10) || 1 };
}

async function primero(env, sql, ...params) { return await env.DB.prepare(sql).bind(...params).first(); }
async function todos(env, sql, ...params) { return (await env.DB.prepare(sql).bind(...params).all()).results || []; }

// ---------- caché de Cloudflare (sustituye al KV) ----------
async function cacheGet(nombre) {
  try {
    const r = await caches.default.match(new Request(CACHE_BASE + nombre));
    return r ? await r.text() : null;
  } catch (e) { return null; }
}
async function cachePut(nombre, valor, segundos) {
  try {
    await caches.default.put(new Request(CACHE_BASE + nombre),
      new Response(String(valor), { headers: { "Cache-Control": "public, max-age=" + segundos } }));
  } catch (e) {}
}
async function cacheDel(nombre) {
  try { await caches.default.delete(new Request(CACHE_BASE + nombre)); } catch (e) {}
}

// ---------- límites, clave y tasa (sin KV) ----------
async function excedeLimitePedidos(env, correo, maximo) {
  const hace1h = new Date(Date.now() - 3600000).toISOString();
  const r = correo
    ? await primero(env, "SELECT COUNT(*) AS n FROM ordenes WHERE lower(correo_cliente) = ?1 AND fecha > ?2", correo, hace1h)
    : await primero(env, "SELECT COUNT(*) AS n FROM ordenes WHERE (correo_cliente IS NULL OR correo_cliente = '') AND fecha > ?1", hace1h);
  return (r ? r.n : 0) >= maximo;
}

// 8 fallos por IP = 15 min de bloqueo, contados en la caché de Cloudflare.
export async function validarAdmin(env, request, password) {
  const ip = request.headers.get("CF-Connecting-IP") || "x";
  const llave = "fallos/" + encodeURIComponent(ip);
  const fallos = parseInt((await cacheGet(llave)) || "0", 10) || 0;
  if (fallos >= 8) throw new ErrorHttp("Demasiados intentos. Espera 15 minutos.", 429);
  const guardada = String(env.ADMIN_PASSWORD || "");
  if (!guardada || !iguales(String(password || ""), guardada)) {
    await cachePut(llave, fallos + 1, 900);
    throw new ErrorHttp("Clave incorrecta", 401);
  }
  if (fallos) await cacheDel(llave);
}

export async function obtenerTasa(env) {
  try {
    const c = await cacheGet("tasa_bs");
    if (c) return parseFloat(c);
    const fila = await primero(env, "SELECT valor FROM config WHERE clave = 'ultima_tasa'");
    const ultima = fila ? parseFloat(fila.valor) : NaN;
    if (await cacheGet("tasa_fallo")) return isNaN(ultima) ? null : ultima;
    try {
      const r = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
      if (r.ok) {
        const d = await r.json();
        let t = parseFloat(d.promedio);
        if (isNaN(t) && d.compra != null && d.venta != null) t = (parseFloat(d.compra) + parseFloat(d.venta)) / 2;
        if (!isNaN(t) && t > 0) {
          await cachePut("tasa_bs", t, 6 * 3600);
          try { await env.DB.prepare("INSERT OR REPLACE INTO config (clave, valor) VALUES ('ultima_tasa', ?1)").bind(String(t)).run(); } catch (e) {}
          return t;
        }
      }
    } catch (e) {}
    await cachePut("tasa_fallo", "1", 300);
    return isNaN(ultima) ? null : ultima;
  } catch (e) { return null; }
}

// ---------- colores y variantes ----------
function parsearStockColores(texto) {
  const mapa = Object.create(null);
  if (!texto) return mapa;
  String(texto).split(",").forEach((par) => {
    const p = par.split(":");
    if (p.length !== 2) return;
    const nombre = p[0].trim();
    const c = parseInt(p[1].trim(), 10);
    if (nombre && !isNaN(c)) mapa[nombre.toLowerCase()] = { nombreOriginal: nombre, cantidad: c };
  });
  return mapa;
}
function serializarStockColores(mapa) {
  return Object.keys(mapa).map((k) => mapa[k].nombreOriginal + ":" + Math.max(0, mapa[k].cantidad)).join(", ");
}
function parsearStockVariantes(texto) {
  const mapa = Object.create(null);
  if (!texto) return mapa;
  String(texto).split(",").forEach((par) => {
    const p = par.split(":");
    if (p.length !== 2) return;
    const c = parseInt(p[1].trim(), 10);
    if (isNaN(c)) return;
    const m = p[0].split("|");
    if (m.length !== 2) return;
    const color = m[0].trim(), talla = m[1].trim();
    if (!color || !talla) return;
    mapa[color.toLowerCase() + "|" + talla.toLowerCase()] = { colorOriginal: color, tallaOriginal: talla, cantidad: c };
  });
  return mapa;
}
function serializarStockVariantes(mapa) {
  return Object.keys(mapa).map((k) => mapa[k].colorOriginal + "|" + mapa[k].tallaOriginal + ":" + Math.max(0, mapa[k].cantidad)).join(", ");
}

// Carga TODOS los productos y los indexa en JS por nombre en minúsculas.
// (SQLite no distingue tildes/mayúsculas igual que JS: "Única" no se convierte con lower(),
// así que la comparación se hace aquí y no en el SQL.)
async function cargarProductos(env) {
  const filas = await todos(env, "SELECT * FROM productos");
  const mapa = {};
  filas.forEach((p) => {
    const k = clave(p.producto);
    if (k && !mapa[k]) mapa[k] = p;
  });
  return mapa;
}

// Busca un producto por el nombre que mande el cliente (tolera "Producto - Color · Talla X (x2)").
function buscarProducto(prods, nombre) {
  const k = clave(nombre);
  if (prods[k]) return prods[k];
  const base = descomponer({ producto: nombre }).base;
  if (prods[base]) return prods[base];
  const sinTalla = k.replace(/\s*·?\s*talla\s.+$/, "").trim();
  if (sinTalla && prods[sinTalla]) return prods[sinTalla];
  return null;
}

export async function invalidarCatalogo() {
  try { await caches.default.delete(new Request(CLAVE_CACHE_CATALOGO)); } catch (e) {}
}

// ============================================================
// CATÁLOGO (CSV con los mismos encabezados de la hoja Productos)
// ============================================================
function aCSV(filas) {
  return filas.map((fila) => fila.map((celda) => {
    const s = String(celda === null || celda === undefined ? "" : celda);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(",")).join("\n");
}

export async function catalogoCSV(env) {
  const fila = await primero(env, "SELECT valor FROM config WHERE clave = 'productos_headers'");
  let headers = [];
  try { headers = JSON.parse(fila.valor); } catch (e) {}
  if (!headers.length) headers = ["producto", "precio", "categoria", "stock", "disponible", "vendidos", "fecha", "stock_colores", "stock_variantes"];
  const esPrivada = (h) => PALABRAS_PRIVADAS.some((p) => normalizar(h).indexOf(normalizar(p)) !== -1);
  const publicos = headers.filter((h) => h && !esPrivada(h));
  const prods = await todos(env, "SELECT * FROM productos ORDER BY id");
  const salida = [publicos];
  prods.forEach((p) => {
    let extra = {};
    try { extra = JSON.parse(p.extra || "{}"); } catch (e) {}
    salida.push(publicos.map((h) => {
      const n = normalizar(h).replace(/[\s_\-]/g, "");
      if (n === "producto") return p.producto;
      if (n === "precio") return p.precio;
      if (n === "categoria") return p.categoria;
      if (n === "stock") return p.stock;
      if (n === "disponible") return p.disponible;
      if (n === "vendidos") return p.vendidos;
      if (n === "fecha") return p.fecha || "";
      if (n === "stockcolores") return p.stock_colores;
      if (n === "stockvariantes") return p.stock_variantes;
      return extra[h] === undefined ? "" : extra[h];
    }));
  });
  return aCSV(salida);
}

// ============================================================
// PEDIDOS DE LA WEB
// ============================================================
function prepararReserva(items, prods) {
  const reservas = {};
  const lineas = [];
  let cantidadTotalOrden = 0;
  items.forEach((it0) => {
    const it = it0 || {};
    const nombreIt = it.nombre || it.producto || "";
    const p = buscarProducto(prods, nombreIt);
    if (!p) throw new Error("Producto no encontrado: " + limpiar(nombreIt, 60));
    if (String(p.disponible || "").trim().toLowerCase() === "no") throw new Error('"' + p.producto + '" ya no está disponible');
    const cantidad = entero(it.cantidad, 1, MAX_CANTIDAD_ITEM, 1);
    const color = limpiar(it.color, 40), talla = limpiar(it.talla, 20);
    cantidadTotalOrden += cantidad;
    let r = reservas[p.id];
    if (!r) {
      r = reservas[p.id] = { p, total: 0, colores: Object.create(null), variantes: Object.create(null),
        mapC: parsearStockColores(p.stock_colores), mapV: parsearStockVariantes(p.stock_variantes) };
    }
    r.total += cantidad;
    const kv = color.toLowerCase() + "|" + talla.toLowerCase(), kc = color.toLowerCase();
    if (color && talla && r.mapV[kv]) r.variantes[kv] = (r.variantes[kv] || 0) + cantidad;
    else if (color && r.mapC[kc]) r.colores[kc] = (r.colores[kc] || 0) + cantidad;
    else if (color && (Object.keys(r.mapC).length || Object.keys(r.mapV).length)) {
      throw new Error('Esa variante de "' + p.producto + '" no está disponible');
    }
    lineas.push({ p, cantidad, color, talla });
  });
  Object.keys(reservas).forEach((id) => {
    const r = reservas[id];
    const stock = parseInt(r.p.stock, 10) || 0;
    if (stock < r.total) throw new Error('No hay suficiente stock de "' + r.p.producto + '" (quedan ' + stock + ")");
    Object.keys(r.colores).forEach((k) => {
      if (r.mapC[k].cantidad < r.colores[k]) throw new Error('No hay suficiente stock de "' + r.p.producto + '" en ' + r.mapC[k].nombreOriginal + " (quedan " + r.mapC[k].cantidad + ")");
    });
    Object.keys(r.variantes).forEach((k) => {
      const v = r.mapV[k];
      if (v.cantidad < r.variantes[k]) throw new Error('No hay suficiente stock de "' + r.p.producto + '" en ' + v.colorOriginal + " talla " + v.tallaOriginal + " (quedan " + v.cantidad + ")");
    });
  });
  return { reservas, lineas, cantidadTotalOrden };
}

export async function crearOrden(env, datos) {
  const items = datos.items;
  if (!Array.isArray(items) || !items.length) throw new Error("El carrito está vacío");
  if (items.length > MAX_ITEMS_PEDIDO) throw new Error("Demasiadas prendas en un solo pedido");
  const metodoPago = limpiar(datos.metodoPago, 40);
  const referencia = limpiar(datos.referencia, 40);
  const telefonoPago = limpiar(datos.telefonoPago, 20);
  const correo = limpiar(String(datos.correoCliente || "").toLowerCase(), 120);
  if (!metodoPago) throw new Error("Falta el método de pago");
  if (metodoPago !== "Efectivo en tienda" && !referencia) throw new Error("Falta el número de referencia del pago");
  if (await excedeLimitePedidos(env, correo, correo ? 10 : 40)) {
    throw new Error("Hiciste muchos pedidos seguidos. Intenta más tarde.");
  }

  let resultados = null, ultimoError = null, idOrden = "", total = 0;
  for (let intento = 0; intento < 3 && !resultados; intento++) {
    const prods = await cargarProductos(env);
    const plan = prepararReserva(items, prods);
    const stmts = [];
    Object.keys(plan.reservas).forEach((id) => {
      const r = plan.reservas[id];
      Object.keys(r.colores).forEach((k) => { r.mapC[k].cantidad -= r.colores[k]; });
      Object.keys(r.variantes).forEach((k) => { r.mapV[k].cantidad -= r.variantes[k]; });
      const viejoC = String(r.p.stock_colores || ""), viejoV = String(r.p.stock_variantes || "");
      const nuevoC = Object.keys(r.colores).length ? serializarStockColores(r.mapC) : viejoC;
      const nuevoV = Object.keys(r.variantes).length ? serializarStockVariantes(r.mapV) : viejoV;
      // Si algo cambió mientras tanto, el stock queda en -1, el CHECK falla y TODO se revierte.
      stmts.push(env.DB.prepare(
        "UPDATE productos SET stock = CASE WHEN COALESCE(stock_colores,'') = ?1 AND COALESCE(stock_variantes,'') = ?2 AND stock >= ?3 THEN stock - ?3 ELSE -1 END, " +
        "disponible = CASE WHEN stock - ?3 <= 0 THEN 'no' ELSE disponible END, stock_colores = ?4, stock_variantes = ?5 WHERE id = ?6"
      ).bind(viejoC, viejoV, r.total, nuevoC, nuevoV, r.p.id));
    });
    idOrden = crypto.randomUUID();
    const desc = plan.cantidadTotalOrden >= UMBRAL_VENTA_MAYOR ? DESCUENTO_MAYOR_UNITARIO : 0;
    total = 0;
    const filasItems = plan.lineas.map((l) => {
      const unit = Math.max(0, (parseFloat(l.p.precio) || 0) - desc);
      total += unit * l.cantidad;
      return env.DB.prepare("INSERT INTO orden_items (id_orden, producto, color, talla, cantidad, precio_unit, categoria) VALUES (?1,?2,?3,?4,?5,?6,?7)")
        .bind(idOrden, String(l.p.producto).trim(), l.color, l.talla, l.cantidad, unit, l.p.categoria || "");
    });
    total = redondear2(total);
    stmts.push(env.DB.prepare("UPDATE config SET valor = CAST(CAST(valor AS INTEGER) + 1 AS TEXT) WHERE clave = 'ultimo_numero_orden'"));
    stmts.push(env.DB.prepare(
      "INSERT INTO ordenes (id_orden, numero_orden, fecha, estado, metodo_pago, referencia, telefono_pago, correo_cliente, comprobante_url, motivo, total) " +
      "VALUES (?1, (SELECT CAST(valor AS INTEGER) FROM config WHERE clave = 'ultimo_numero_orden'), ?2, 'pendiente', ?3, ?4, ?5, ?6, '', '', ?7)"
    ).bind(idOrden, ahora(), metodoPago, referencia, telefonoPago, correo, total));
    filasItems.forEach((s) => stmts.push(s));
    stmts.push(env.DB.prepare("SELECT numero_orden FROM ordenes WHERE id_orden = ?1").bind(idOrden));
    try { resultados = await env.DB.batch(stmts); } catch (e) { ultimoError = e; }
  }
  if (!resultados) {
    console.error("crearOrden fallo", ultimoError && ultimoError.message);
    throw new Error("Hay mucha actividad en este momento, intenta de nuevo.");
  }
  const ult = resultados[resultados.length - 1];
  await invalidarCatalogo();
  return { ok: true, idOrden: idOrden, numeroOrden: ult.results[0].numero_orden, total: total };
}

export async function estadoOrden(env, codigo, correo) {
  const buscado = String(codigo || "").trim().replace(/^#/, "").toLowerCase();
  if (!buscado) return { ok: true, estado: "no encontrado" };
  const correoB = String(correo || "").trim().toLowerCase();
  let o = null;
  if (/^[0-9a-f-]{32,36}$/.test(buscado)) {
    o = await primero(env, "SELECT * FROM ordenes WHERE id_orden = ?1", buscado);
  } else if (/^[0-9a-f]{8}$/.test(buscado)) {
    o = await primero(env, "SELECT * FROM ordenes WHERE lower(replace(id_orden,'-','')) LIKE ?1 || '%' ORDER BY fecha DESC LIMIT 1", buscado);
    if (o && correoB && o.correo_cliente && String(o.correo_cliente).toLowerCase() !== correoB) o = null;
  } else if (/^\d+$/.test(buscado) && correoB) {
    o = await primero(env, "SELECT * FROM ordenes WHERE numero_orden = ?1 AND lower(correo_cliente) = ?2", parseInt(buscado, 10), correoB);
  }
  if (!o) return { ok: true, estado: "no encontrado" };
  const its = await todos(env, "SELECT * FROM orden_items WHERE id_orden = ?1 ORDER BY id", o.id_orden);
  return {
    ok: true, idOrden: o.id_orden, estado: String(o.estado || "pendiente").toLowerCase(),
    numeroOrden: o.numero_orden, fecha: o.fecha, metodoPago: o.metodo_pago || "", motivo: o.motivo || "",
    items: its.map((it) => ({ producto: lineaNombre(it), categoria: it.categoria, precio: it.precio_unit * it.cantidad })),
    total: o.total,
  };
}

export async function historialCliente(env, correo) {
  const c = String(correo || "").trim().toLowerCase();
  if (!c) return [];
  const f = await todos(env, "SELECT * FROM ventas WHERE correo_cliente = ?1 ORDER BY fecha DESC LIMIT 500", c);
  return f.map((v) => ({ fecha: v.fecha, producto: v.producto || "", categoria: v.categoria || "", precio: v.precio || 0,
    canal: v.canal || "", precioBs: v.precio_bs === null ? "" : v.precio_bs, tasaBs: v.tasa_bs === null ? "" : v.tasa_bs, metodoPago: v.metodo_pago || "" }));
}

// ============================================================
// PANEL: LISTAS
// ============================================================
async function listarOrdenes(env, estado) {
  let cond = "estado = ?1";
  const params = [estado];
  let limite = 300;
  if (estado === "aceptado") limite = 60;
  if (estado === "rechazado") {
    const hoy = hoyVzla();
    cond += " AND (fecha_rechazo IS NULL OR (fecha_rechazo >= ?2 AND fecha_rechazo < ?3))";
    params.push(inicioDia(hoy), inicioDia(sumarDias(hoy, 1)));
  }
  const ords = await todos(env, "SELECT * FROM ordenes WHERE " + cond + " ORDER BY fecha DESC LIMIT " + limite, ...params);
  if (!ords.length) return [];
  const its = await todos(env,
    "SELECT * FROM orden_items WHERE id_orden IN (SELECT id_orden FROM ordenes WHERE " + cond + " ORDER BY fecha DESC LIMIT " + limite + ") ORDER BY id", ...params);
  const por = {};
  its.forEach((it) => { (por[it.id_orden] = por[it.id_orden] || []).push(it); });
  return ords.map((o) => ({
    idOrden: o.id_orden, numeroOrden: o.numero_orden, fecha: o.fecha, metodoPago: o.metodo_pago || "",
    referencia: o.referencia || "", telefonoPago: o.telefono_pago || "", motivo: o.motivo || "",
    comprobanteUrl: o.comprobante_url || "", total: o.total,
    items: (por[o.id_orden] || []).map((it) => ({ producto: lineaNombre(it), categoria: it.categoria, precio: it.precio_unit * it.cantidad })),
  }));
}

async function listarVentas(env) {
  const f = await todos(env, "SELECT rowid AS _rid, * FROM ventas WHERE lower(trim(COALESCE(metodo_pago,''))) != 'fiado' ORDER BY fecha DESC LIMIT 400");
  return f.map((v) => ({ fecha: v.fecha, producto: v.producto || "", categoria: v.categoria || "", precio: v.precio || 0,
    id: v._rid, idVenta: v._rid, correo: v.correo_cliente || "", canal: v.canal || "", precioBs: v.precio_bs === null ? "" : v.precio_bs,
    tasaBs: v.tasa_bs === null ? "" : v.tasa_bs, nota: v.nota || "", metodoPago: v.metodo_pago || "" }));
}

async function listarFiados(env) {
  const f = await todos(env, "SELECT * FROM fiados ORDER BY fecha DESC LIMIT 1000");
  return f.map((r) => ({ id: r.id, idVenta: r.id, fecha: r.fecha, clienteNombre: r.cliente || "", producto: r.producto || "",
    precio: r.precio || 0, total: r.precio || 0, precioBs: r.precio_bs === null ? "" : r.precio_bs, tasaBs: r.tasa_bs === null ? "" : r.tasa_bs,
    fechaPago: r.fecha_pago || "", estadoPago: String(r.estado_pago || "pendiente").toLowerCase().trim(), nota: r.nota || "", correo: r.correo || "" }));
}

async function listarGastos(env) {
  const f = await todos(env, "SELECT * FROM gastos ORDER BY fecha DESC LIMIT 1000");
  return f.map((r) => ({ id: r.id, idGasto: r.id, fecha: r.fecha || "", concepto: r.concepto || "", monto: r.monto || 0, categoria: r.categoria || "", nota: r.nota || "" }));
}

async function resumenDeHoy(env) {
  const hoy = hoyVzla();
  const r = await primero(env,
    "SELECT COALESCE(SUM(precio),0) AS total, COUNT(*) AS n FROM ventas WHERE fecha >= ?1 AND fecha < ?2 AND lower(trim(COALESCE(metodo_pago,''))) != 'fiado'",
    inicioDia(hoy), inicioDia(sumarDias(hoy, 1)));
  return { totalHoy: r.total, cantidadHoy: r.n };
}

async function calcularSemanas(env) {
  const tasa = (await obtenerTasa(env)) || 0;
  const usd = METODOS_USD.map((m) => "'" + m + "'").join(",");
  const met = "lower(trim(COALESCE(metodo_pago,'')))";
  const f = await todos(env,
    "SELECT date(datetime(fecha,'-4 hours'),'-6 days','weekday 1') AS semana, COUNT(*) AS prendas, " +
    "SUM(CASE WHEN " + met + " IN (" + usd + ") THEN precio ELSE 0 END) AS usd, " +
    "SUM(CASE WHEN " + met + " IN (" + usd + ") THEN 0 ELSE COALESCE(precio_bs, precio * ?1) END) AS bs " +
    "FROM ventas WHERE " + met + " != 'fiado' GROUP BY semana ORDER BY semana DESC", tasa);
  return f.filter((r) => r.semana).map((r) => ({ semana: r.semana, desde: r.semana, hasta: sumarDias(r.semana, 6),
    prendas: r.prendas, totalBs: redondear2(r.bs || 0), totalUsd: redondear2(r.usd || 0) }));
}

async function cerrarSemana(env) {
  const semanas = await calcularSemanas(env);
  const stmts = [env.DB.prepare("DELETE FROM cierre_semanal")];
  const t = ahora();
  semanas.forEach((s) => stmts.push(env.DB.prepare("INSERT INTO cierre_semanal (semana, desde, hasta, prendas, total_bs, total_usd, actualizado) VALUES (?1,?2,?3,?4,?5,?6,?7)")
    .bind(s.semana, s.desde, s.hasta, s.prendas, s.totalBs, s.totalUsd, t)));
  await env.DB.batch(stmts);
  return { ok: true, semanas: semanas.length, mensaje: semanas.length ? "Cierre semanal actualizado: " + semanas.length + " semanas." : "No hay ventas que resumir todavía." };
}

async function vaciarVentas(env) {
  const n = (await primero(env, "SELECT COUNT(*) AS c FROM ventas")).c;
  if (n <= 0) return { ok: true, mensaje: "No hay ventas registradas para borrar." };
  try { await cerrarSemana(env); } catch (e) {}
  const nombre = "Ventas_Backup_" + ahora().slice(0, 19).replace(/[-:T]/g, "_");
  await env.DB.batch([env.DB.prepare("CREATE TABLE " + nombre + " AS SELECT * FROM ventas"), env.DB.prepare("DELETE FROM ventas")]);
  return { ok: true, mensaje: "Se borraron " + n + " ventas. Quedó el respaldo '" + nombre + "' y el total de cada semana en 'cierre_semanal'." };
}

// ============================================================
// ACEPTAR / RECHAZAR
// ============================================================
const SQL_VENTA = "INSERT INTO ventas (fecha, producto, categoria, precio, correo_cliente, canal, precio_bs, tasa_bs, nota, metodo_pago) ";
const stmtVenta = (env, v) => env.DB.prepare(SQL_VENTA + "VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)").bind(...v);
const stmtVentaSi = (env, v, cond, extra) =>
  env.DB.prepare(SQL_VENTA + "SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10 WHERE EXISTS (" + cond + ")").bind(...v, ...extra);

async function procesarOrden(env, orden, aceptar, motivo, tasa) {
  let ok = false, ultimo = null;
  for (let intento = 0; intento < 3 && !ok; intento++) {
    const its = await todos(env, "SELECT * FROM orden_items WHERE id_orden = ?1 ORDER BY id", orden.id_orden);
    const prods = await cargarProductos(env);
    const t = ahora();
    const pend = "SELECT 1 FROM ordenes WHERE id_orden = ?11 AND estado = 'pendiente'";
    const stmts = [];
    const reservas = {};
    its.forEach((it0) => {
      const d = descomponer(it0);
      const it = Object.assign({}, it0, { color: it0.color || d.color, talla: it0.talla || d.talla, cantidad: it0.cantidad || d.cantidad });
      const p = buscarProducto(prods, d.base);
      if (p) {
        let r = reservas[p.id];
        if (!r) r = reservas[p.id] = { p, total: 0, colores: Object.create(null), variantes: Object.create(null),
          mapC: parsearStockColores(p.stock_colores), mapV: parsearStockVariantes(p.stock_variantes) };
        r.total += it.cantidad;
        const kv = String(it.color || "").toLowerCase() + "|" + String(it.talla || "").toLowerCase(), kc = String(it.color || "").toLowerCase();
        if (it.color && it.talla && r.mapV[kv]) r.variantes[kv] = (r.variantes[kv] || 0) + it.cantidad;
        else if (it.color) r.colores[kc] = (r.colores[kc] || 0) + it.cantidad;
      }
      if (aceptar) {
        const precio = it0.precio_unit * it0.cantidad;
        stmts.push(stmtVentaSi(env, [t, lineaNombre(it0), it0.categoria || "", precio, orden.correo_cliente || "", "Virtual", bsDe(precio, tasa), tasa || null, "",
          String(orden.metodo_pago || "") + (orden.referencia ? " (" + orden.referencia + ")" : "")], pend, [orden.id_orden]));
      }
    });
    Object.keys(reservas).forEach((id) => {
      const r = reservas[id];
      if (aceptar) {
        stmts.push(env.DB.prepare("UPDATE productos SET vendidos = vendidos + ?1, fecha = ?2 WHERE id = ?3 AND EXISTS (SELECT 1 FROM ordenes WHERE id_orden = ?4 AND estado = 'pendiente')")
          .bind(r.total, t, r.p.id, orden.id_orden));
      } else {
        Object.keys(r.colores).forEach((k) => { if (r.mapC[k]) r.mapC[k].cantidad += r.colores[k]; });
        Object.keys(r.variantes).forEach((k) => { if (r.mapV[k]) r.mapV[k].cantidad += r.variantes[k]; });
        const viejoC = String(r.p.stock_colores || ""), viejoV = String(r.p.stock_variantes || "");
        const nuevoC = Object.keys(r.colores).some((k) => r.mapC[k]) ? serializarStockColores(r.mapC) : viejoC;
        const nuevoV = Object.keys(r.variantes).length ? serializarStockVariantes(r.mapV) : viejoV;
        stmts.push(env.DB.prepare(
          "UPDATE productos SET stock = CASE WHEN COALESCE(stock_colores,'') = ?1 AND COALESCE(stock_variantes,'') = ?2 THEN stock + ?3 ELSE -1 END, " +
          "disponible = CASE WHEN stock + ?3 > 0 THEN 'si' ELSE disponible END, stock_colores = ?4, stock_variantes = ?5 " +
          "WHERE id = ?6 AND EXISTS (SELECT 1 FROM ordenes WHERE id_orden = ?7 AND estado = 'pendiente')"
        ).bind(viejoC, viejoV, r.total, nuevoC, nuevoV, r.p.id, orden.id_orden));
      }
    });
    if (aceptar) {
      stmts.push(env.DB.prepare("UPDATE ordenes SET estado = 'aceptado' WHERE id_orden = ?1 AND estado = 'pendiente'").bind(orden.id_orden));
    } else {
      stmts.push(env.DB.prepare("UPDATE ordenes SET estado = 'rechazado', motivo = ?2, fecha_rechazo = ?3 WHERE id_orden = ?1 AND estado = 'pendiente'")
        .bind(orden.id_orden, limpiar(motivo, 300), t));
    }
    try { await env.DB.batch(stmts); ok = true; } catch (e) { ultimo = e; }
  }
  if (!ok) { console.error("procesarOrden fallo", ultimo && ultimo.message); throw new Error("No se pudo procesar la orden, intenta de nuevo."); }
}

async function responderOrdenes(env, ids, aceptar, motivo) {
  const pend = await todos(env, "SELECT * FROM ordenes WHERE estado = 'pendiente'");
  const set = ids ? new Set(ids.map(String)) : null;
  const ordenes = pend.filter((o) => !set || set.has(o.id_orden));
  if (!ordenes.length) throw new Error("Orden no encontrada o ya fue procesada");
  const tasa = aceptar ? await obtenerTasa(env) : null;
  for (const o of ordenes) await procesarOrden(env, o, aceptar, motivo, tasa);
  await invalidarCatalogo();
  return ordenes.length;
}

// ============================================================
// VENTA EN TIENDA / FIADO / CASHEA
// ============================================================
function construirPlan(env, o) {
  const total = dinero(o.total);
  const inicial = Math.min(dinero(o.inicial), total);
  const financiado = redondear2(total - inicial);
  if (total <= 0) throw new Error("El total de la venta debe ser mayor que cero");
  if (financiado <= 0.004) throw new Error("No queda nada financiado: registra esa venta como venta normal");
  const cuotas = entero(o.cuotas, 1, 24, total <= CASHEA_LIMITE_TRES_CUOTAS ? 3 : 6);
  const cuotaSugerida = redondear2(financiado / cuotas);
  const proximo = /^\d{4}-\d{2}-\d{2}$/.test(String(o.proximoCobro || "")) ? o.proximoCobro : sumarDias(hoyVzla(), CASHEA_DIAS_ENTRE_COBROS);
  const id = "CAS-" + uuid8();
  const stmt = env.DB.prepare(
    "INSERT INTO cashea (id, fecha, cliente, producto, total, inicial, financiado, cuotas, cuota_sugerida, cobros, cobrado_usd, saldo, proximo_cobro, estado, nota, correo) " +
    "VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,0,0,?7,?10,'activo',?11,?12)"
  ).bind(id, ahora(), limpiar(o.cliente, 80), limpiar(o.producto, 300), total, inicial, financiado, cuotas, cuotaSugerida, proximo,
    limpiar(o.nota, 300), limpiar(String(o.correo || "").toLowerCase(), 120));
  return { stmt, info: { idPlan: id, total, inicial, financiado, cuotas, cuotaSugerida, proximoCobro: proximo } };
}

async function ventaFisica(env, datos) {
  const metodoPago = limpiar(datos.metodoPago, 40);
  const esFiado = Boolean(datos.esFiado || metodoPago === "Fiado");
  const clienteNombre = limpiar(datos.clienteNombre, 80);
  const fechaPago = limpiar(datos.fechaPago, 20);
  const correo = limpiar(String(datos.correoCliente || "").toLowerCase(), 120);
  const notaGeneral = limpiar(datos.nota, 300);
  if (!metodoPago) throw new Error("Falta el método de pago");
  if (esFiado && !clienteNombre) throw new Error("Falta el nombre del cliente para el fiado");

  let items = [];
  if (Array.isArray(datos.items) && datos.items.length) items = datos.items;
  else if (datos.nombre || datos.producto) {
    items = [{ nombre: datos.nombre || datos.producto, precio: datos.precio, categoria: datos.categoria, cantidad: datos.cantidad, nota: notaGeneral }];
  } else throw new Error("No hay prendas para registrar en la venta");
  if (items.length > 100) throw new Error("Demasiadas prendas en una sola venta");

  const tasa = await obtenerTasa(env);
  const t = ahora();
  const lineas = [], nombresItems = [], porProducto = {};
  let totalPiezas = 0, totalVenta = 0;
  items.forEach((it) => {
    const nombreItem = String(it.nombre || it.producto || "").trim();
    if (!nombreItem) return;
    const c = entero(it.cantidad, 1, 999, 1);
    const precioLinea = redondear2(dinero(it.precio || it.precioUnitario || it.precioFinal) * c);
    totalPiezas += c; totalVenta += precioLinea;
    const nom = limpiar(nombreItem, 120);
    nombresItems.push(nom + (c > 1 ? " (x" + c + ")" : ""));
    lineas.push({ nombre: nom, cant: c, precio: precioLinea, categoria: limpiar(it.categoria, 60), nota: limpiar(it.nota || notaGeneral, 300) });
    const k = clave(nombreItem);
    porProducto[k] = (porProducto[k] || 0) + c;
  });
  if (totalPiezas === 0) throw new Error("Ninguna prenda válida para registrar");
  totalVenta = redondear2(totalVenta);

  const esCashea = !esFiado && metodoPago.toLowerCase() === "cashea";
  let inicial = 0, conPlan = false;
  if (esCashea) {
    const cd = datos.cashea && typeof datos.cashea === "object" ? datos.cashea : {};
    if (cd.inicial !== undefined && cd.inicial !== null && cd.inicial !== "") inicial = dinero(cd.inicial);
    else if (cd.pct) inicial = redondear2(totalVenta * Math.min(100, Math.max(0, parseFloat(cd.pct) || 0)) / 100);
    else inicial = dinero(datos.inicial);
    inicial = Math.min(inicial, totalVenta);
    conPlan = redondear2(totalVenta - inicial) > 0.004;
  }

  const stmts = [];
  const prods = await cargarProductos(env);
  Object.keys(porProducto).forEach((k) => {
    const p = prods[k];
    if (!p) return; // igual que Apps Script: si no está en el catálogo, solo se registra la venta
    stmts.push(env.DB.prepare(
      "UPDATE productos SET stock = MAX(stock - ?1, 0), disponible = CASE WHEN stock - ?1 <= 0 THEN 'no' ELSE disponible END, vendidos = vendidos + ?1, fecha = ?2 WHERE id = ?3"
    ).bind(porProducto[k], t, p.id));
  });

  let respuesta;
  if (esCashea && conPlan) {
    const plan = construirPlan(env, { cliente: clienteNombre, producto: nombresItems.join(", "), total: totalVenta, inicial: inicial,
      cuotas: datos.cashea && datos.cashea.cuotas, nota: notaGeneral, correo: correo });
    stmts.push(plan.stmt);
    if (inicial > 0) {
      stmts.push(stmtVenta(env, [t, nombresItems.join(", "), "Cashea Inicial", inicial, correo, "Física", bsDe(inicial, tasa), tasa || null,
        "Inicial Cashea ID " + plan.info.idPlan + (notaGeneral ? " - " + notaGeneral : ""), "Cashea"]));
    }
    respuesta = { ok: true, esCashea: true, idPlan: plan.info.idPlan, idVenta: plan.info.idPlan, totalItems: lineas.length, totalPrendas: totalPiezas,
      totalVenta: totalVenta, inicial: inicial, financiado: plan.info.financiado, cuotas: plan.info.cuotas, cuotaSugerida: plan.info.cuotaSugerida,
      proximoCobro: plan.info.proximoCobro, tasaBs: tasa || null, mensaje: "Venta Cashea registrada: la inicial suma hoy y el resto queda por cobrar." };
  } else if (esFiado) {
    const idFiado = "FIA-" + uuid8();
    stmts.push(env.DB.prepare("INSERT INTO fiados (id, fecha, cliente, producto, precio, precio_bs, tasa_bs, fecha_pago, estado_pago, nota, correo) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,'pendiente',?9,?10)")
      .bind(idFiado, t, clienteNombre, nombresItems.join(", "), totalVenta, bsDe(totalVenta, tasa), tasa || null, fechaPago || null, notaGeneral, correo));
    respuesta = { ok: true, esFiado: true, idFiado: idFiado, totalItems: lineas.length, totalPrendas: totalPiezas, totalVenta: totalVenta,
      mensaje: "Fiado registrado (no suma a las ventas del día hasta que paguen)." };
  } else {
    lineas.forEach((l) => {
      stmts.push(stmtVenta(env, [t, l.nombre + (l.cant > 1 ? " (x" + l.cant + ")" : ""), l.categoria, l.precio, correo, "Física", bsDe(l.precio, tasa), tasa || null, l.nota, metodoPago]));
    });
    respuesta = { ok: true, esFiado: false, totalItems: lineas.length, totalPrendas: totalPiezas, totalVenta: totalVenta, tasaBs: tasa || null };
  }
  await env.DB.batch(stmts);
  await invalidarCatalogo();
  return respuesta;
}

async function marcarFiadoPagado(env, datos) {
  const id = String(datos.idVenta || datos.idFiado || datos.id || "").trim();
  if (!id) throw new Error("Falta el ID del fiado a pagar");
  const metodo = limpiar(datos.metodoPago || "Pago Móvil", 40);
  const f = await primero(env, "SELECT * FROM fiados WHERE id = ?1", id);
  if (!f) throw new Error("Fiado no encontrado");
  if (String(f.estado_pago || "").trim().toLowerCase() === "pagado") throw new Error("Este fiado ya fue cobrado");
  const tasa = await obtenerTasa(env);
  const precio = f.precio || 0;
  await env.DB.batch([
    stmtVentaSi(env, [ahora(), "Cobro Fiado: " + (f.producto || "Prenda") + " (" + (f.cliente || "Cliente") + ")", "Fiado Cobrado", precio, f.correo || "", "Física",
      bsDe(precio, tasa), tasa || null, "Fiado cobrado ID " + id, metodo], "SELECT 1 FROM fiados WHERE id = ?11 AND estado_pago != 'pagado'", [id]),
    env.DB.prepare("UPDATE fiados SET estado_pago = 'pagado' WHERE id = ?1").bind(id),
  ]);
  return { ok: true, mensaje: "Fiado cobrado y sumado a las ventas de hoy." };
}

async function editarVenta(env, datos) {
  const id = parseInt(String(datos.idVenta || datos.id || "").trim(), 10);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Falta el ID de la venta");

  const v = await primero(env, "SELECT rowid AS _rid, * FROM ventas WHERE rowid = ?1", id);
  if (!v) throw new Error("Venta no encontrada");

  const producto = limpiar(datos.producto, 300);
  if (!producto) throw new Error("El producto no puede quedar vacío");

  const precioNum = parseFloat(String(datos.precio === undefined || datos.precio === null ? "" : datos.precio).replace(",", "."));
  if (!isFinite(precioNum) || precioNum < 0 || precioNum > 99999) throw new Error("Precio inválido");
  const precio = redondear2(precioNum);

  let precioBs = v.precio_bs === undefined ? null : v.precio_bs;
  if (datos.precioBs !== undefined && datos.precioBs !== null && datos.precioBs !== "") {
    const b = parseFloat(String(datos.precioBs).replace(",", "."));
    if (isFinite(b) && b >= 0 && b <= 99999999) precioBs = redondear2(b);
  } else if (precioBs !== null && Number(v.tasa_bs) > 0 && precio !== Number(v.precio)) {
    precioBs = redondear2(precio * Number(v.tasa_bs));
  }

  const r = await env.DB.prepare("UPDATE ventas SET producto = ?1, precio = ?2, precio_bs = ?3 WHERE rowid = ?4")
    .bind(producto, precio, precioBs, id).run();
  if (!r.meta || !r.meta.changes) throw new Error("No se pudo actualizar la venta");
  return { ok: true, idVenta: id, mensaje: "Venta actualizada" };
}

async function agregarGasto(env, datos) {
  const concepto = limpiar(datos.concepto, 120);
  const monto = dinero(datos.monto);
  if (!concepto || monto <= 0) throw new Error("Hace falta el concepto y un monto mayor que cero");
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(datos.fecha || "")) ? datos.fecha : hoyVzla();
  const id = "GAS-" + uuid8();
  await env.DB.prepare("INSERT INTO gastos (id, fecha, concepto, monto, categoria, nota) VALUES (?1,?2,?3,?4,?5,?6)")
    .bind(id, fecha, concepto, monto, limpiar(datos.categoria || "Otros", 60), limpiar(datos.nota, 300)).run();
  return { ok: true, idGasto: id, mensaje: "Gasto registrado" };
}

async function eliminarGasto(env, datos) {
  const id = String(datos.idGasto || "").trim();
  if (!id) throw new Error("Falta el ID del gasto");
  const r = await env.DB.prepare("DELETE FROM gastos WHERE id = ?1").bind(id).run();
  if (!r.meta || !r.meta.changes) throw new Error("Gasto no encontrado");
  return { ok: true, mensaje: "Gasto eliminado" };
}

// ============================================================
// CASHEA
// ============================================================
async function listarPlanes(env) {
  const f = await todos(env, "SELECT * FROM cashea WHERE lower(COALESCE(estado,'activo')) != 'anulado' ORDER BY fecha DESC");
  const finSemana = sumarDias(inicioSemana(hoyVzla()), 6);
  const resumen = { totalPorCobrar: 0, cuotaSemana: 0, planesActivos: 0 };
  const planes = f.map((p) => {
    const saldo = Math.max(0, p.saldo || 0), cuotas = p.cuotas || 1, cuotaSugerida = p.cuota_sugerida || 0, cobros = p.cobros || 0;
    const activo = saldo > 0.004;
    const cuotaSig = !activo ? 0 : (cobros + 1 >= cuotas ? saldo : Math.min(cuotaSugerida, saldo));
    if (activo) {
      resumen.totalPorCobrar += saldo;
      if (p.proximo_cobro && p.proximo_cobro <= finSemana) resumen.cuotaSemana += cuotaSig;
      resumen.planesActivos++;
    }
    return { id: p.id, idVenta: p.id, idPlan: p.id, fecha: p.fecha || "", cliente: p.cliente || "", clienteNombre: p.cliente || "", producto: p.producto || "",
      total: p.total || 0, inicial: p.inicial || 0, financiado: p.financiado || 0, cuotas: cuotas, cuotaSugerida: cuotaSugerida, cobros: cobros,
      cobradoUSD: p.cobrado_usd || 0, saldo: redondear2(saldo), proximoCobro: p.proximo_cobro || "", estado: activo ? "activo" : "pagado",
      nota: p.nota || "", correo: p.correo || "" };
  });
  resumen.totalPorCobrar = redondear2(resumen.totalPorCobrar);
  resumen.cuotaSemana = redondear2(resumen.cuotaSemana);
  return { ok: true, planes: planes, resumen: resumen, totalPorCobrar: resumen.totalPorCobrar, cuotaSemana: resumen.cuotaSemana, planesActivos: resumen.planesActivos };
}

async function casheaCrear(env, datos) {
  const plan = construirPlan(env, { cliente: datos.clienteNombre || datos.cliente, producto: datos.producto || datos.descripcion,
    total: datos.total || datos.precio, inicial: datos.inicial, cuotas: datos.cuotas, proximoCobro: datos.proximoCobro, nota: datos.nota,
    correo: datos.correoCliente || datos.correo });
  await plan.stmt.run();
  return Object.assign({ ok: true, mensaje: "Plan Cashea registrado" }, plan.info);
}

async function casheaAnular(env, datos) {
  const id = String(datos.idVenta || datos.idPlan || datos.id || "").trim();
  if (!id) throw new Error("Falta el ID del plan Cashea");
  const p = await primero(env, "SELECT estado FROM cashea WHERE id = ?1", id);
  if (!p) throw new Error("Plan Cashea no encontrado");
  if (String(p.estado || "").toLowerCase() === "anulado") throw new Error("Este plan ya estaba anulado");
  await env.DB.prepare("UPDATE cashea SET estado = 'anulado' WHERE id = ?1").bind(id).run();
  return { ok: true, idVenta: id, mensaje: "Plan Cashea anulado" };
}

async function casheaCobro(env, datos) {
  const id = String(datos.idVenta || datos.idPlan || datos.id || "").trim();
  if (!id) throw new Error("Falta el ID del plan Cashea");
  const p = await primero(env, "SELECT * FROM cashea WHERE id = ?1", id);
  if (!p) throw new Error("Plan Cashea no encontrado");
  if (String(p.estado || "").toLowerCase() === "anulado") throw new Error("Este plan está anulado");
  const saldo = p.saldo || 0;
  if (saldo <= 0.004) throw new Error("Este plan ya fue cobrado completo");
  const cuotasPlan = p.cuotas || 1, cobrosPrevios = p.cobros || 0, cuotaSug = p.cuota_sugerida || saldo;
  const tasa = await obtenerTasa(env);
  const porCuotas = datos.cuotas !== undefined && datos.cuotas !== null && datos.cuotas !== "";
  let cuotasPagadas = 0, usd = 0, bs = 0, bsEnUsd = 0, monto = 0;

  if (porCuotas) {
    const restantes = Math.max(1, cuotasPlan - cobrosPrevios);
    cuotasPagadas = parseInt(datos.cuotas, 10);
    if (isNaN(cuotasPagadas) || cuotasPagadas < 1) throw new Error("Indica cuántas cuotas te pagaron (de 1 a " + restantes + ")");
    if (cuotasPagadas > restantes) throw new Error("Solo faltan " + restantes + " cuota(s) por cobrar en este plan");
    monto = cuotasPagadas >= restantes ? saldo : redondear2(Math.min(cuotaSug * cuotasPagadas, saldo));
    usd = monto;
  } else {
    usd = dinero(datos.usd !== undefined ? datos.usd : datos.monto);
    bs = dinero(datos.bs);
    if (bs > 0 && !tasa) throw new Error("No hay tasa BCV disponible para convertir los bolívares. Cobra en dólares o intenta en un momento.");
    bsEnUsd = bs > 0 ? redondear2(bs / tasa) : 0;
    monto = redondear2(usd + bsEnUsd);
    cuotasPagadas = 1;
    if (monto <= 0) throw new Error("El monto del cobro debe ser mayor que cero");
    if (monto > saldo + 0.5) throw new Error("El cobro ($" + monto + ") supera lo que falta por cobrar ($" + redondear2(saldo) + ")");
    if (monto > saldo) {
      const sobra = redondear2(monto - saldo);
      if (usd >= sobra) usd = redondear2(usd - sobra); else bsEnUsd = redondear2(bsEnUsd - sobra);
      monto = saldo;
    }
  }

  const cobros = cobrosPrevios + cuotasPagadas;
  const cobrado = redondear2((p.cobrado_usd || 0) + monto);
  let nuevoSaldo = redondear2(saldo - monto);
  if (nuevoSaldo < 0.01) nuevoSaldo = 0;
  const estado = nuevoSaldo === 0 ? "pagado" : "activo";
  const proximo = nuevoSaldo === 0 ? (p.proximo_cobro || null) : sumarDias(p.proximo_cobro || hoyVzla(), CASHEA_DIAS_ENTRE_COBROS * cuotasPagadas);

  const cliente = p.cliente || "Cliente", producto = p.producto || "Venta", correo = p.correo || "";
  const nota = limpiar(datos.nota, 300) || ("Cobro Cashea ID " + id + (cuotasPagadas > 1 ? " (cuotas " + (cobrosPrevios + 1) + "-" + cobros + ")" : " (cuota " + cobros + ")"));
  const titulo = "Cobro Cashea: " + producto + " (" + cliente + ")";
  const t = ahora();
  // El UPDATE va primero: las ventas solo se insertan si el plan ya quedó con el saldo/cobros nuevos.
  const cond = "SELECT 1 FROM cashea WHERE id = ?11 AND saldo = ?12 AND cobros = ?13";
  const extra = [id, nuevoSaldo, cobros];
  const stmts = [env.DB.prepare("UPDATE cashea SET cobros = ?1, cobrado_usd = ?2, saldo = ?3, estado = ?4, proximo_cobro = ?5 WHERE id = ?6 AND saldo = ?7 AND cobros = ?8")
    .bind(cobros, cobrado, nuevoSaldo, estado, proximo, id, p.saldo, p.cobros || 0)];
  if (porCuotas) {
    stmts.push(stmtVentaSi(env, [t, titulo, "Cashea Cobrado", monto, correo, "Física", bsDe(monto, tasa), tasa || null, nota, "Cashea"], cond, extra));
  } else if (usd > 0) {
    stmts.push(stmtVentaSi(env, [t, titulo, "Cashea Cobrado", usd, correo, "Física", bsDe(usd, tasa), tasa || null, nota, "Cashea USD"], cond, extra));
  }
  if (bsEnUsd > 0) {
    stmts.push(stmtVentaSi(env, [t, titulo, "Cashea Cobrado", bsEnUsd, correo, "Física", bs, tasa || null, nota, "Cashea Bs"], cond, extra));
  }
  const res = await env.DB.batch(stmts);
  if (!res[0].meta || !res[0].meta.changes) throw new Error("El plan cambió mientras cobrabas. Recarga e intenta de nuevo.");
  return { ok: true, idVenta: id, cobrado: monto, cuotasCobradas: cuotasPagadas, cobros: cobros, saldoPendiente: nuevoSaldo, estado: estado,
    mensaje: nuevoSaldo === 0 ? "Plan cobrado completo y sumado a las ventas de hoy." : "Cobro registrado y sumado a las ventas de hoy." };
}

// ============================================================
// DESPACHO DEL PANEL (admin-pedidos)
// ============================================================
export async function despacharAdmin(env, accion, datos) {
  switch (accion) {
    case "pedidos": return { ok: true, ordenes: await listarOrdenes(env, "pendiente") };
    case "aceptados": return { ok: true, ordenes: await listarOrdenes(env, "aceptado") };
    case "rechazadas": return { ok: true, ordenes: await listarOrdenes(env, "rechazado") };
    case "ventas": return { ok: true, ventas: await listarVentas(env) };
    case "fiados": return { ok: true, fiados: await listarFiados(env) };
    case "gastos": return { ok: true, gastos: await listarGastos(env) };
    case "resumen": { const r = await resumenDeHoy(env); return Object.assign({ ok: true, resumen: r }, r); }
    case "semanas":
    case "resumenSemanal": return { ok: true, semanas: await calcularSemanas(env) };
    case "historialCliente":
      if (!datos.correo) throw new Error("Falta el correo del cliente");
      return { ok: true, compras: await historialCliente(env, datos.correo) };
    case "cashea_planes":
    case "casheaPlanes": return await listarPlanes(env);
    case "aceptarOrden":
    case "rechazarOrden": {
      const id = String(datos.idOrden || "");
      if (!id) throw new Error("Falta el id de la orden");
      await responderOrdenes(env, [id], accion === "aceptarOrden", datos.motivo);
      return { ok: true };
    }
    case "rechazar_todos": return { ok: true, cantidad: await rechazarTodas(env) };
    case "ventaFisica":
    case "ventaFisicaLote": return await ventaFisica(env, datos);
    case "marcarFiadoPagado": return await marcarFiadoPagado(env, datos);
    case "editarVenta": return await editarVenta(env, datos);
    case "agregarGasto": return await agregarGasto(env, datos);
    case "eliminarGasto": return await eliminarGasto(env, datos);
    case "vaciarVentas": return await vaciarVentas(env);
    case "cerrarSemana": return await cerrarSemana(env);
    case "cashea_cobro":
    case "cashea_cobrar": return await casheaCobro(env, datos);
    case "cashea_crear_plan":
    case "cashea_plan": return await casheaCrear(env, datos);
    case "cashea_anular": return await casheaAnular(env, datos);
    default: throw new Error("Acción no permitida: " + accion);
  }
}

async function rechazarTodas(env) {
  try { return await responderOrdenes(env, null, false, ""); } catch (e) { return 0; }
}