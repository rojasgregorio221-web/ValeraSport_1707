// GET /api/obtener-productos
// Descarga el CSV del catálogo desde Google Sheets y lo devuelve al navegador.
// El link del Sheet queda oculto como variable de entorno, nunca en el código fuente.

export async function onRequestGet(context) {
  const SHEET_CSV_URL = context.env.SHEET_CSV_URL;

  if (!SHEET_CSV_URL) {
    return new Response(
      "Falta configurar la variable de entorno SHEET_CSV_URL en Cloudflare Pages (Settings > Environment variables).",
      { status: 500 }
    );
  }

  try {
    const respuesta = await fetch(SHEET_CSV_URL);
    if (!respuesta.ok) throw new Error("Google Sheets respondió con error " + respuesta.status);

    const textoCSV = await respuesta.text();

    return new Response(textoCSV, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    return new Response("Error al obtener el catálogo desde Google Sheets: " + error.message, {
      status: 500,
    });
  }
}