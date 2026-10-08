// GET /api/obtener-productos
// Descarga el CSV del catálogo desde Google Sheets y devuelve al navegador
// SOLO las columnas públicas. Cualquier otra columna (costos, ganancias,
// proveedor, notas) se descarta aquí en el servidor y nunca llega al navegador.
//
// El link del Sheet queda oculto como variable de entorno (SHEET_CSV_URL).
//
// CACHÉ: se mantiene corta a propósito para que los cambios de stock se vean
// rápido. Google ya tiene su propia caché, por eso se agrega un parámetro
// rompe-caché (_t) a la URL.

// ⚠️ EDITA ESTA LISTA con los nombres EXACTOS de las columnas de tu Sheet
// (la primera fila). Solo las columnas que escribas aquí se enviarán.
// No importan mayúsculas ni espacios al inicio/final.
const COLUMNAS_PUBLICAS = [
  "foto",
  "producto",
  "categoria",
  "precio",
  "color",
  "disponible",
];

// Convierte texto CSV en filas (maneja comillas, comas y saltos de línea dentro de celdas)
function parsearCSV(texto) {
  const filas = [];
  let fila = [];
  let celda = "";
  let enComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (enComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (c === '"') {
        enComillas = false;
      } else {
        celda += c;
      }
    } else if (c === '"') {
      enComillas = true;
    } else if (c === ",") {
      fila.push(celda);
      celda = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else {
      celda += c;
    }
  }

  if (celda !== "" || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }

  return filas;
}

// Convierte filas de vuelta a texto CSV
function aCSV(filas) {
  return filas
    .map((fila) =>
      fila
        .map((celda) => {
          const s = String(celda ?? "");
          return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        })
        .join(",")
    )
    .join("\n");
}

export async function onRequestGet(context) {
  const SHEET_CSV_URL = context.env.SHEET_CSV_URL;

  if (!SHEET_CSV_URL) {
    return new Response(
      "Falta configurar la variable de entorno SHEET_CSV_URL en Cloudflare Pages (Settings > Environment variables).",
      { status: 500 }
    );
  }

  try {
    const separador = SHEET_CSV_URL.includes("?") ? "&" : "?";
    const urlSinCache = SHEET_CSV_URL + separador + "_t=" + Date.now();

    const respuesta = await fetch(urlSinCache, {
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (!respuesta.ok) throw new Error("Google Sheets respondió con error " + respuesta.status);

    const textoCSV = await respuesta.text();
    const filas = parsearCSV(textoCSV);

    if (filas.length === 0) throw new Error("El Sheet llegó vacío");

    // Buscar qué posiciones (índices) corresponden a las columnas permitidas
    const permitidas = COLUMNAS_PUBLICAS.map((n) => n.trim().toLowerCase());
    const encabezados = filas[0].map((h) => h.trim().toLowerCase());
    const indices = [];
    encabezados.forEach((h, i) => {
      if (permitidas.includes(h)) indices.push(i);
    });

    if (indices.length === 0) {
      throw new Error("Ninguna columna de COLUMNAS_PUBLICAS coincide con el Sheet");
    }

    // Conservar solo esas columnas en cada fila
    const filasFiltradas = filas.map((fila) => indices.map((i) => fila[i] ?? ""));

    return new Response(aCSV(filasFiltradas), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        // max-age=5: navegador. s-maxage=30: caché de Cloudflare.
        // Corta para que los cambios de stock se vean rápido.
        "Cache-Control": "public, max-age=5, s-maxage=30",
      },
    });
  } catch (error) {
    return new Response("Error al obtener el catálogo desde Google Sheets: " + error.message, {
      status: 500,
    });
  }
}