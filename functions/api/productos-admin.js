import { validarAdmin, jsonResponse, ErrorHttp } from "../_utils/d1.js";

function limpiar(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max || 200);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let d;
  try { d = await request.json(); } catch (e) { return jsonResponse({ ok: false, error: "Solicitud inválida" }, 400); }

  try {
    await validarAdmin(env, request, d.password);
    const accion = String(d.accion || "");

    if (accion === "listar") {
      const r = await env.DB.prepare("SELECT id, producto, precio, categoria, stock, disponible, vendidos, stock_colores, stock_variantes FROM productos ORDER BY producto").all();
      return jsonResponse({ ok: true, productos: r.results || [] }, 200);
    }

    if (accion === "guardar") {
      const nombre = limpiar(d.producto, 120);
      const precio = parseFloat(d.precio);
      if (!nombre) return jsonResponse({ ok: false, error: "Falta el nombre" }, 400);
      if (isNaN(precio) || precio < 0) return jsonResponse({ ok: false, error: "Precio inválido" }, 400);
      const stock = Math.max(0, parseInt(d.stock, 10) || 0);
      const disponible = stock > 0 && String(d.disponible || "si") !== "no" ? "si" : "no";
      const categoria = limpiar(d.categoria, 60);
      const sc = limpiar(d.stock_colores, 500);
      const sv = limpiar(d.stock_variantes, 1000);

      if (d.id) {
        await env.DB.prepare("UPDATE productos SET producto=?1, precio=?2, categoria=?3, stock=?4, disponible=?5, stock_colores=?6, stock_variantes=?7 WHERE id=?8")
          .bind(nombre, precio, categoria, stock, disponible, sc, sv, parseInt(d.id, 10)).run();
      } else {
        await env.DB.prepare("INSERT INTO productos (producto, precio, categoria, stock, disponible, vendidos, fecha, stock_colores, stock_variantes, extra) VALUES (?1,?2,?3,?4,?5,0,?6,?7,?8,'{}')")
          .bind(nombre, precio, categoria, stock, disponible, new Date().toISOString(), sc, sv).run();
      }
      return jsonResponse({ ok: true, mensaje: "Producto guardado" }, 200);
    }

    if (accion === "borrar") {
      const id = parseInt(d.id, 10);
      if (!id) return jsonResponse({ ok: false, error: "Falta el id" }, 400);
      await env.DB.prepare("DELETE FROM productos WHERE id=?1").bind(id).run();
      return jsonResponse({ ok: true, mensaje: "Producto borrado" }, 200);
    }

    return jsonResponse({ ok: false, error: "Acción no permitida" }, 400);
  } catch (e) {
    if (e instanceof ErrorHttp) return jsonResponse({ ok: false, error: e.message }, e.status);
    return jsonResponse({ ok: false, error: "Error: " + (e && e.message) }, 500);
  }
}
