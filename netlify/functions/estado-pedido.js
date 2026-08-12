// netlify/functions/estado-pedido.js
//
// El cliente consulta el estado de su ORDEN (puede tener varios productos).
// Público, sin contraseña: solo necesita el idOrden que le devolvió
// marcar-pagado.js al hacer el checkout.

exports.handler = async (event) => {
  const SHEET_WRITE_URL = process.env.SHEET_WRITE_URL;
  const CLAVE_ADMIN = process.env.CLAVE_ADMIN;

  if (!SHEET_WRITE_URL || !CLAVE_ADMIN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "Faltan variables de entorno en Netlify" }),
    };
  }

  const idOrden = (event.queryStringParameters || {}).idOrden;
  if (!idOrden) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: "Falta el id de la orden" }),
    };
  }

  try {
    const url =
      SHEET_WRITE_URL +
      "?accion=estadoOrden&idOrden=" + encodeURIComponent(idOrden) +
      "&clave=" + encodeURIComponent(CLAVE_ADMIN);

    const respuesta = await fetch(url);
    const texto = await respuesta.text();
    let resultado;
    try {
      resultado = JSON.parse(texto);
    } catch (e) {
      resultado = { ok: false, error: "Respuesta inesperada: " + texto.slice(0, 200) };
    }

    return {
      statusCode: resultado.ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resultado),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "No se pudo conectar: " + error.message }),
    };
  }
};