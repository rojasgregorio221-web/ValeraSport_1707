// netlify/functions/mis-compras.js
//
// El cliente (logueado con Netlify Identity) pide su propio historial de
// compras. Netlify ya verificó su identidad antes de que esta función se
// ejecute -- por eso usamos context.clientContext.user, NUNCA un correo
// que venga del cliente en la petición (eso permitiría a cualquiera pedir
// el historial de otra persona con solo saber su correo).

exports.handler = async (event, context) => {
  const usuario = context.clientContext && context.clientContext.user;

  if (!usuario || !usuario.email) {
    return {
      statusCode: 401,
      body: JSON.stringify({ ok: false, error: "Debes iniciar sesión para ver tu historial" }),
    };
  }

  const SHEET_WRITE_URL = process.env.SHEET_WRITE_URL;
  const CLAVE_ADMIN = process.env.CLAVE_ADMIN;

  if (!SHEET_WRITE_URL || !CLAVE_ADMIN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "Faltan variables de entorno en Netlify" }),
    };
  }

  try {
    const url =
      SHEET_WRITE_URL +
      "?accion=historialCliente" +
      "&correo=" + encodeURIComponent(usuario.email) +
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