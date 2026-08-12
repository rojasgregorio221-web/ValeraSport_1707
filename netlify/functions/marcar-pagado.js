// netlify/functions/marcar-pagado.js
//
// El cliente hace checkout de su carrito (1 o varios productos) -> se crea
// una ORDEN PENDIENTE en el Sheet. El stock de cada producto se reserva
// (descuenta) al instante. El admin la aprueba o rechaza desde admin.html;
// si la rechaza, el stock reservado se devuelve automáticamente.
//
// Body esperado:
// {
//   items: [{ nombre, precio, categoria, cantidad }, ...],
//   metodoPago, referencia, correoCliente
// }

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

  if (!Array.isArray(datos.items) || datos.items.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: "El carrito está vacío" }),
    };
  }

  if (!datos.metodoPago) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: "Falta el método de pago" }),
    };
  }

  if (datos.metodoPago !== "Efectivo en tienda" && !datos.referencia) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: "Falta el número de referencia del pago" }),
    };
  }

  // Endpoint público: acotamos longitudes para evitar payloads gigantes.
  const recortar = (valor, max) => String(valor || "").slice(0, max);

  const itemsLimpios = datos.items.slice(0, 30).map((it) => ({
    nombre: recortar(it.nombre, 200),
    precio: recortar(it.precio, 20),
    categoria: recortar(it.categoria, 100),
    cantidad: Math.max(1, Math.min(99, parseInt(it.cantidad, 10) || 1)),
  }));

  try {
    const respuesta = await fetch(SHEET_WRITE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "carrito",
        items: itemsLimpios,
        metodoPago: recortar(datos.metodoPago, 50),
        referencia: recortar(datos.referencia, 100),
        correoCliente: recortar(datos.correoCliente, 200),
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