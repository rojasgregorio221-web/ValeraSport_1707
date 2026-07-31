exports.handler = async (event) => {
  const SHEET_WRITE_URL = process.env.SHEET_WRITE_URL;
  const CLAVE_ADMIN = process.env.CLAVE_ADMIN;

  if (!SHEET_WRITE_URL || !CLAVE_ADMIN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "Faltan variables de entorno en Netlify" }),
    };
  }

  const id = (event.queryStringParameters || {}).id;
  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: "Falta el id del pedido" }),
    };
  }

  try {
    const url =
      SHEET_WRITE_URL +
      "?accion=estado&id=" + encodeURIComponent(id) +
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