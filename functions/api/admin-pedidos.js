// POST /api/admin-pedidos
//
// Backend del panel de administración (admin.html). Sigue funcionando por
// contraseña (ADMIN_PASSWORD), sin relación con el login de clientes.
//
// POST { password, tipo: "pedidos" }   -> lista de órdenes pendientes (agrupadas)
// POST { password, tipo: "aceptados" } -> últimas órdenes ya aceptadas (agrupadas)
// POST { password, tipo: "resumen" }   -> total vendido hoy
// POST { password, accion: "aceptarOrden"|"rechazarOrden"|"rechazar_todos", idOrden }
// POST { password, accion: "ventaFisica", nombre, precio, categoria,
//        metodoPago, correoCliente } -> registra una venta de tienda física

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function parsearRespuesta(respuesta) {
  const texto = await respuesta.text();
  try {
    return JSON.parse(texto);
  } catch (e) {
    return { ok: false, error: "Respuesta inesperada de Google Sheets: " + texto.slice(0, 200) };
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const SHEET_WRITE_URL = env.SHEET_WRITE_URL;
  const CLAVE_ADMIN = env.CLAVE_ADMIN;
  const ADMIN_PASSWORD = env.ADMIN_PASSWORD;

  if (!SHEET_WRITE_URL || !CLAVE_ADMIN || !ADMIN_PASSWORD) {
    return jsonResponse(
      {
        ok: false,
        error: "Faltan variables de entorno en Cloudflare Pages: SHEET_WRITE_URL, CLAVE_ADMIN o ADMIN_PASSWORD",
      },
      500
    );
  }

  let datos;
  try {
    datos = await request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: "Cuerpo de la petición inválido" }, 400);
  }

  if (datos.password !== ADMIN_PASSWORD) {
    return jsonResponse({ ok: false, error: "Contraseña incorrecta" }, 401);
  }

  // Lectura: listar órdenes pendientes/aceptadas o el resumen de ventas del día
  if (datos.tipo === "pedidos" || datos.tipo === "aceptados" || datos.tipo === "resumen") {
    const url = SHEET_WRITE_URL + "?accion=" + datos.tipo + "&clave=" + encodeURIComponent(CLAVE_ADMIN);
    const respuesta = await fetch(url, { method: "GET" });
    const resultado = await parsearRespuesta(respuesta);
    return jsonResponse(resultado, resultado.ok ? 200 : 500);
  }

  // Escritura: aceptar / rechazar una orden completa / rechazar todas
  if (datos.accion === "aceptarOrden" || datos.accion === "rechazarOrden" || datos.accion === "rechazar_todos") {
    if (!datos.idOrden && datos.accion !== "rechazar_todos") {
      return jsonResponse({ ok: false, error: "Falta el id de la orden" }, 400);
    }

    const respuesta = await fetch(SHEET_WRITE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: datos.accion, idOrden: datos.idOrden, clave: CLAVE_ADMIN }),
    });

    const resultado = await parsearRespuesta(respuesta);
    return jsonResponse(resultado, resultado.ok ? 200 : 500);
  }

  // Escritura: registrar una venta hecha en la tienda física
  if (datos.accion === "ventaFisica") {
    if (!datos.nombre || !datos.metodoPago) {
      return jsonResponse(
        { ok: false, error: "Faltan datos: producto y método de pago son obligatorios" },
        400
      );
    }

    const recortar = (valor, max) => String(valor || "").slice(0, max);

    const respuesta = await fetch(SHEET_WRITE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "ventaFisica",
        nombre: recortar(datos.nombre, 200),
        precio: recortar(datos.precio, 20),
        categoria: recortar(datos.categoria, 100),
        metodoPago: recortar(datos.metodoPago, 50),
        correoCliente: recortar(datos.correoCliente, 200),
        clave: CLAVE_ADMIN,
      }),
    });

    const resultado = await parsearRespuesta(respuesta);
    return jsonResponse(resultado, resultado.ok ? 200 : 500);
  }

  return jsonResponse({ ok: false, error: "Acción inválida" }, 400);
}