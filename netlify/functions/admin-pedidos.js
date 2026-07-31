// netlify/functions/admin-pedidos.js
//
// Backend del panel de administración (admin.html).
//
// La CLAVE_ADMIN real (la que espera Apps Script) vive escondida aquí como
// variable de entorno en Netlify. El navegador nunca la ve: solo manda la
// contraseña del panel (ADMIN_PASSWORD), y esta función es la que agrega
// la clave secreta real antes de hablar con Google.
//
// POST { password, tipo: "pedidos" }   -> lista de pedidos pendientes
// POST { password, tipo: "resumen" }   -> total vendido hoy
// POST { password, accion: "aceptar"|"rechazar"|"rechazar_todos", id }
//      (id no es necesario cuando accion es "rechazar_todos")
//
// Todo va por POST con el password en el body (nunca en la URL) para que
// no quede registrado en logs de acceso ni en el historial del navegador.

exports.handler = async (event) => {
  const SHEET_WRITE_URL = process.env.SHEET_WRITE_URL;
  const CLAVE_ADMIN = process.env.CLAVE_ADMIN;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!SHEET_WRITE_URL || !CLAVE_ADMIN || !ADMIN_PASSWORD) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error:
          "Faltan variables de entorno en Netlify: SHEET_WRITE_URL, CLAVE_ADMIN o ADMIN_PASSWORD",
      }),
    };
  }

  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, error: "Método no permitido" }),
      };
    }

    let datos;
    try {
      datos = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Cuerpo de la petición inválido" }),
      };
    }

    if (datos.password !== ADMIN_PASSWORD) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: "Contraseña incorrecta" }),
      };
    }

    // Lectura: listar pedidos pendientes o el resumen de ventas del día
    if (datos.tipo === "pedidos" || datos.tipo === "resumen") {
      const url =
        SHEET_WRITE_URL +
        "?accion=" + datos.tipo +
        "&clave=" + encodeURIComponent(CLAVE_ADMIN);

      const respuesta = await fetch(url, { method: "GET" });
      const resultado = await parsearRespuesta(respuesta);

      return {
        statusCode: resultado.ok ? 200 : 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultado),
      };
    }

    // Escritura: aceptar / rechazar un pedido
    if (
      datos.accion !== "aceptar" &&
      datos.accion !== "rechazar" &&
      datos.accion !== "rechazar_todos"
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Acción inválida" }),
      };
    }

    if (!datos.id && datos.accion !== "rechazar_todos") {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Falta el id del pedido" }),
      };
    }

    const respuesta = await fetch(SHEET_WRITE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: datos.accion,
        id: datos.id,
        clave: CLAVE_ADMIN,
      }),
    });

    const resultado = await parsearRespuesta(respuesta);

    return {
      statusCode: resultado.ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resultado),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "No se pudo conectar con Google Sheets: " + error.message,
      }),
    };
  }
};

async function parsearRespuesta(respuesta) {
  const texto = await respuesta.text();
  try {
    return JSON.parse(texto);
  } catch (e) {
    return {
      ok: false,
      error: "Respuesta inesperada de Google Sheets: " + texto.slice(0, 200),
    };
  }
}