// netlify/functions/marcar-pagado.js
//
// Esta función recibe desde el navegador el nombre del producto que se marcó
// como "pagado" y lo reenvía a un Google Apps Script (Web App) que es el único
// que tiene permiso de ESCRITURA sobre tu Google Sheet.
//
// La URL de ese Apps Script vive escondida en Netlify como variable de entorno
// SHEET_WRITE_URL, igual que ya haces con SHEET_CSV_URL. Nunca queda expuesta
// en el código que sube a GitHub ni en el navegador del cliente.

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
        error: "Falta configurar SHEET_WRITE_URL en las variables de entorno de Netlify",
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