import { despacharAdmin, validarAdmin, jsonResponse, ErrorHttp, invalidarCatalogo } from "../_utils/d1.js";

const LECTURAS = ["pedidos", "aceptados", "rechazadas", "ventas", "fiados", "gastos", "resumen", "semanas", "resumenSemanal", "historialCliente", "cashea_planes"];
const ACCIONES = ["aceptarOrden", "rechazarOrden", "rechazar_todos", "ventaFisica", "ventaFisicaLote", "marcarFiadoPagado", "agregarGasto", "eliminarGasto", "editarVenta", "vaciarVentas", "cerrarSemana", "cashea_cobro", "cashea_crear_plan", "cashea_anular"];
const INVENTARIO = ["guardarProducto", "eliminarProducto"];

const clave = (t) => String(t || "").trim().toLowerCase();

// "Negro:5, Azul:3"  o  "Negro|M:2, Negro|L:3"  (mismo formato que usa d1.js)
function pares(txt, conTalla) {
  const t = String(txt || "").trim();
  if (!t) return { texto: "", suma: 0, n: 0 };
  const vistos = new Set(), lista = [];
  let suma = 0;
  for (const par of t.split(",")) {
    const s = par.trim();
    if (!s) continue;
    const i = s.lastIndexOf(":");
    if (i < 1) return { error: 'Formato inválido: "' + s + '". Usa Nombre:cantidad.' };
    let nombre = s.slice(0, i).trim();
    const cs = s.slice(i + 1).trim();
    if (!/^\d{1,5}$/.test(cs)) return { error: 'Cantidad inválida en "' + s + '".' };
    if (!nombre || nombre.length > 60 || nombre.includes(":")) return { error: 'Nombre inválido en "' + s + '".' };
    if (conTalla) {
      const m = nombre.split("|");
      if (m.length !== 2 || !m[0].trim() || !m[1].trim()) return { error: 'Usa Color|Talla:cantidad en "' + s + '".' };
      nombre = m[0].trim() + "|" + m[1].trim();
    } else if (nombre.includes("|")) {
      return { error: 'En colores no uses "|" ("' + s + '").' };
    }
    const k = nombre.toLowerCase();
    if (vistos.has(k)) return { error: 'Repetido: "' + nombre + '".' };
    vistos.add(k);
    const c = parseInt(cs, 10);
    suma += c;
    lista.push(nombre + ":" + c);
  }
  return { texto: lista.join(", "), suma, n: lista.length };
}

async function claveCodigo(env) {
  try {
    const f = await env.DB.prepare("SELECT valor FROM config WHERE clave = 'productos_headers'").first();
    const hs = JSON.parse(f.valor);
    const h = hs.find((x) => String(x).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_\-]/g, "") === "codigo");
    return h || "codigo";
  } catch (e) { return "codigo"; }
}

function leerExtra(f) { try { return JSON.parse(f.extra || "{}"); } catch (e) { return {}; } }

async function guardarProducto(env, cuerpo) {
  const p = cuerpo.producto || {};
  const nombre = String(p.nombre || p.producto || "").trim().replace(/\s+/g, " ");
  const codigo = String(p.codigo || "").trim().toUpperCase();
  const categoria = String(p.categoria || "").trim().replace(/\s+/g, " ").slice(0, 40);
  const precio = Math.round(parseFloat(String(p.precio).replace(",", ".")) * 100) / 100;

  if (nombre.length < 2 || nombre.length > 80) return { ok: false, error: "Nombre inválido (2 a 80 letras)." };
  if (codigo && !/^[A-Z0-9_-]{2,20}$/.test(codigo)) return { ok: false, error: "Código inválido." };
  if (!isFinite(precio) || precio <= 0 || precio > 9999) return { ok: false, error: "Precio inválido." };

  const cols = pares(p.stock_colores, false);
  if (cols.error) return { ok: false, error: "Stock por color: " + cols.error };
  const vars = pares(p.stock_variantes, true);
  if (vars.error) return { ok: false, error: "Stock por talla: " + vars.error };

  let stock;
  if (vars.n) stock = vars.suma;
  else if (cols.n) stock = cols.suma;
  else {
    stock = Number(p.stock);
    if (!Number.isInteger(stock) || stock < 0 || stock > 99999) return { ok: false, error: "Stock inválido." };
  }
  const disponible = stock > 0 ? "si" : "no";

  const filas = (await env.DB.prepare("SELECT id, producto, extra FROM productos").all()).results || [];
  const kCod = await claveCodigo(env);
  const codDe = (f) => String(leerExtra(f)[kCod] || "").trim().toUpperCase();

  let actual = null;
  if (!cuerpo.esNuevo) {
    const ant = String(cuerpo.codigoAnterior || "").trim().toUpperCase();
    actual = (ant && filas.find((f) => codDe(f) === ant)) || filas.find((f) => clave(f.producto) === clave(cuerpo.nombreAnterior || nombre)) || null;
    if (!actual) return { ok: false, error: "No encontré la prenda para actualizar." };
  }
  const otros = filas.filter((f) => !actual || f.id !== actual.id);
  if (otros.some((f) => clave(f.producto) === clave(nombre))) return { ok: false, error: 'Ya existe una prenda llamada "' + nombre + '".' };
  if (codigo && otros.some((f) => codDe(f) === codigo)) return { ok: false, error: "Ya existe una prenda con el código " + codigo + "." };

  if (actual) {
    const extra = leerExtra(actual);
    if (codigo) extra[kCod] = codigo; else delete extra[kCod];
    await env.DB.prepare(
      "UPDATE productos SET producto = ?1, precio = ?2, categoria = ?3, stock = ?4, disponible = ?5, stock_colores = ?6, stock_variantes = ?7, extra = ?8 WHERE id = ?9"
    ).bind(nombre, precio, categoria, stock, disponible, cols.texto, vars.texto, JSON.stringify(extra), actual.id).run();
  } else {
    const extra = codigo ? { [kCod]: codigo } : {};
    await env.DB.prepare(
      "INSERT INTO productos (producto, precio, categoria, stock, disponible, vendidos, fecha, stock_colores, stock_variantes, extra) VALUES (?1,?2,?3,?4,?5,0,?6,?7,?8,?9)"
    ).bind(nombre, precio, categoria, stock, disponible, new Date().toISOString(), cols.texto, vars.texto, JSON.stringify(extra)).run();
  }
  await invalidarCatalogo();
  return { ok: true, stock, mensaje: actual ? "Cambios guardados" : "Prenda agregada" };
}

async function eliminarProducto(env, cuerpo) {
  const cod = String(cuerpo.codigo || "").trim().toUpperCase();
  const nom = clave(cuerpo.nombre);
  if (!cod && !nom) return { ok: false, error: "Falta el código o el nombre." };
  const filas = (await env.DB.prepare("SELECT id, producto, extra FROM productos").all()).results || [];
  const kCod = await claveCodigo(env);
  const f = (cod && filas.find((x) => String(leerExtra(x)[kCod] || "").trim().toUpperCase() === cod)) || filas.find((x) => clave(x.producto) === nom);
  if (!f) return { ok: false, error: "No encontré esa prenda." };
  await env.DB.prepare("DELETE FROM productos WHERE id = ?1").bind(f.id).run();
  await invalidarCatalogo();
  return { ok: true, mensaje: "Prenda borrada" };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let datos;
  try { datos = await request.json(); } catch (e) { return jsonResponse({ ok: false, error: "Solicitud inválida" }, 400); }

  try {
    await validarAdmin(env, request, datos.password);
    const accion = String(datos.accion || datos.tipo || "");
    if (![...LECTURAS, ...ACCIONES, ...INVENTARIO].includes(accion)) {
      return jsonResponse({ ok: false, error: "Acción no permitida: " + accion }, 400);
    }
    const cuerpo = Object.assign({}, datos);
    delete cuerpo.password;
    delete cuerpo.tipo;
    cuerpo.accion = accion;

    if (accion === "guardarProducto") return jsonResponse(await guardarProducto(env, cuerpo), 200);
    if (accion === "eliminarProducto") return jsonResponse(await eliminarProducto(env, cuerpo), 200);
    return jsonResponse(await despacharAdmin(env, accion, cuerpo), 200);
  } catch (e) {
    if (e instanceof ErrorHttp) return jsonResponse({ ok: false, error: e.message, mensaje: e.message }, e.status);
    console.error("admin-pedidos:", e && e.message);
    const msg = e && e.message ? e.message : "Error inesperado";
    return jsonResponse({ ok: false, error: msg, mensaje: msg }, 200);
  }
}