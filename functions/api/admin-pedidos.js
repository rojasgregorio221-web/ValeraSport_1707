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

// ---------- Freno anti fuerza-bruta para la contraseña del panel ----------
// Vive en memoria del "worker" de Cloudflare mientras esté activo (no es un
// contador 100% global entre todos los centros de datos, pero sí frena de
// forma efectiva a un script que intente adivinar la contraseña a golpes).
const MAX_INTENTOS_FALLIDOS = 5;
const VENTANA_BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos
const intentosFallidosPorIP = new Map();

function limpiarIntentosViejos(ahora) {
  for (const [ip, info] of intentosFallidosPorIP) {
    if (ahora - info.ultimoIntento > VENTANA_BLOQUEO_MS) intentosFallidosPorIP.delete(ip);
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

  const ip = request.headers.get("CF-Connecting-IP") || "desconocida";
  const ahora = Date.now();
  limpiarIntentosViejos(ahora);

  const registro = intentosFallidosPorIP.get(ip);
  if (registro && registro.cantidad >= MAX_INTENTOS_FALLIDOS && ahora - registro.ultimoIntento < VENTANA_BLOQUEO_MS) {
    const minutosRestantes = Math.ceil((VENTANA_BLOQUEO_MS - (ahora - registro.ultimoIntento)) / 60000);
    return jsonResponse(
      { ok: false, error: "Demasiados intentos fallidos. Intenta de nuevo en " + minutosRestantes + " minuto(s)." },
      429
    );
  }

  let datos;
  try {
    datos = await request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: "Cuerpo de la petición inválido" }, 400);
  }

  if (datos.password !== ADMIN_PASSWORD) {
    const actual = intentosFallidosPorIP.get(ip) || { cantidad: 0, ultimoIntento: 0 };
    intentosFallidosPorIP.set(ip, { cantidad: actual.cantidad + 1, ultimoIntento: ahora });
    return jsonResponse({ ok: false, error: "Contraseña incorrecta" }, 401);
  }

  intentosFallidosPorIP.delete(ip);

  // Lectura: listar órdenes pendientes/aceptadas/rechazadas, el registro de
  // ventas (caja registradora) o el resumen de ventas del día
  if (
    datos.tipo === "pedidos" ||
    datos.tipo === "aceptados" ||
    datos.tipo === "resumen" ||
    datos.tipo === "rechazadas" ||
    datos.tipo === "ventas"
  ) {
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

    const cuerpo = { accion: datos.accion, idOrden: datos.idOrden, clave: CLAVE_ADMIN };
    if (datos.accion === "rechazarOrden" && datos.motivo) {
      cuerpo.motivo = String(datos.motivo).slice(0, 300);
    }

    const respuesta = await fetch(SHEET_WRITE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });

    const resultado = await parsearRespuesta(respuesta);
    return jsonResponse(resultado, resultado.ok ? 200 : 500);
  }

  // Escritura: registrar una venta hecha en la tienda física (soporta lote o prenda individual)
  if (datos.accion === "ventaFisica") {
    const tieneItems = Array.isArray(datos.items) && datos.items.length > 0;
    if (!datos.metodoPago || (!datos.nombre && !tieneItems)) {
      return jsonResponse(
        { ok: false, error: "Faltan datos: producto (o lista de prendas) y método de pago son obligatorios" },
        400
      );
    }

    const recortar = (valor, max) => String(valor || "").slice(0, max);

    const cuerpo = {
      accion: "ventaFisica",
      metodoPago: recortar(datos.metodoPago, 50),
      correoCliente: recortar(datos.correoCliente, 200),
      nota: recortar(datos.nota, 300),
      clave: CLAVE_ADMIN,
    };

    if (tieneItems) {
      cuerpo.items = datos.items;
      cuerpo.nombre = recortar(datos.items[0].nombre || datos.items[0].producto, 200);
    } else {
      cuerpo.nombre = recortar(datos.nombre, 200);
      cuerpo.precio = recortar(datos.precio, 20);
      cuerpo.categoria = recortar(datos.categoria, 100);
    }

    const respuesta = await fetch(SHEET_WRITE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });

    const resultado = await parsearRespuesta(respuesta);
    return jsonResponse(resultado, resultado.ok ? 200 : 500);
  }

  // Escritura: vaciar todas las ventas (solo admin)
  if (datos.accion === "vaciarVentas") {
    const respuesta = await fetch(SHEET_WRITE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "vaciarVentas",
        clave: CLAVE_ADMIN,
      }),
    });

    const resultado = await parsearRespuesta(respuesta);
    return jsonResponse(resultado, resultado.ok ? 200 : 500);
  }

  return jsonResponse({ ok: false, error: "Acción inválida" }, 400);
}