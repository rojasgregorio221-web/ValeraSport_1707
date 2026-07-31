// netlify/functions/marcar-pagado.js
//
// El cliente marca "pagado" -> creamos un PEDIDO PENDIENTE en el Sheet
// (todavía NO se descuenta stock). El admin lo aprueba desde admin.html.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, error: "Método no permitido" }),
    };
  }

  const SHEET_WRITE_URL = process.env.SHEET_WRITE_URL;

  if (!SHEET_WRITE_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Falta configurar la variable de entorno SHEET_WRITE_URL en Netlify",
      }),
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

  if (!datos.nombre) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: "Falta el nombre del producto" }),
    };
  }

  try {
    const respuesta = await fetch(SHEET_WRITE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "pagado",
        nombre: datos.nombre,
        precio: datos.precio || "",
        categoria: datos.categoria || "",
      }),
      redirect: "follow",
    });

    const texto = await respuesta.text();
    let resultado;
    try {
      resultado = JSON.parse(texto);
    } catch (e) {
      resultado = {
        ok: false,
        error: "Respuesta inesperada de Google Sheets: " + texto.slice(0, 200),
      };
    }

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