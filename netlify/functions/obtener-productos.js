// Esta función corre en el servidor de Netlify, NUNCA en el navegador del cliente.
// Por eso el link del Google Sheet (guardado como variable de entorno) queda oculto:
// nadie que vea el código fuente de tu página o tu repositorio de GitHub podrá verlo.

exports.handler = async function (event, context) {
    const SHEET_CSV_URL = process.env.SHEET_CSV_URL;

    // Si olvidaste configurar la variable de entorno en Netlify, avisamos claro en vez de fallar en silencio.
    if (!SHEET_CSV_URL) {
        return {
            statusCode: 500,
            body: "Falta configurar la variable de entorno SHEET_CSV_URL en Netlify (Site settings > Environment variables)."
        };
    }

    try {
        const respuesta = await fetch(SHEET_CSV_URL);

        if (!respuesta.ok) {
            throw new Error("Google Sheets respondió con error " + respuesta.status);
        }

        const textoCSV = await respuesta.text();

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                // Guarda la respuesta en caché 5 minutos para no golpear el Sheet en cada visita.
                "Cache-Control": "public, max-age=300"
            },
            body: textoCSV
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: "Error al obtener el catálogo desde Google Sheets: " + error.message
        };
    }
};