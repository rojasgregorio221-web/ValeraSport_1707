// GET /api/obtener-productos
// Descarga el CSV del catálogo desde Google Sheets y lo devuelve al navegador,
// quitando las columnas privadas (costos, ganancias, proveedor, etc.).
//
// Funciona al revés que un filtro de "solo estas columnas": aquí pasa TODO lo
// que la tienda ya usa (imagen, colores, tallas, stock...) y solo se descartan
// las columnas cuyo encabezado contenga alguna de las palabras de abajo.
// Así, si agregas una columna nueva para la tienda, funciona sin tocar este
// archivo; y si agregas una de costos, queda bloqueada automáticamente.
//
// El link del Sheet queda oculto como variable de entorno (SHEET_CSV_URL).

// Si el encabezado de una columna CONTIENE alguna de estas palabras
// (sin importar mayúsculas ni tildes), esa columna NO se envía al navegador.
// Ejemplos que quedarían bloqueados: "costo", "Precio costo", "% ganancia",
// "Proveedor", "Margen", "Utilidad", "Notas internas".
const PALABRAS_PRIVADAS = [
  "costo",
  "ganancia",
  "margen",
  "utilidad",
  "proveedor",
  "porcentaje",
  "%",
  "interno",
  "privado",
  "compra",
];

function normalizar(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita tildes
}

function esColumnaPrivada(encabezado) {
  const h = normalizar(encabezado);
  return PALABRAS_PRIVADAS.some((p) => h.includes(normalizar(p)));
}

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
    // Rompe-caché: parámetro único para que el CDN de Google no devuelva una copia vieja.
    const separador = SHEET_CSV_URL.includes("?") ? "&" : "?";
    const urlSinCache = SHEET_CSV_URL + separador + "_t=" + Date.now();

    const respuesta = await fetch(urlSinCache, {
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (!respuesta.ok) throw new Error("Google Sheets respondió con error " + respuesta.status);

    const textoCSV = await respuesta.text();
    const filas = parsearCSV(textoCSV);

    if (filas.length === 0) throw new Error("El Sheet llegó vacío");

    // Posiciones de las columnas que SÍ se pueden enviar
    const indicesPublicos = [];
    filas[0].forEach((encabezado, i) => {
      if (!esColumnaPrivada(encabezado)) indicesPublicos.push(i);
    });

    // Quitar columnas privadas y filas completamente vacías
    const filasLimpias = filas
      .map((fila) => indicesPublicos.map((i) => fila[i] ?? ""))
      .filter((fila, n) => n === 0 || fila.some((celda) => String(celda).trim() !== ""));

    return new Response(aCSV(filasLimpias), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        // Caché corta para que los cambios de stock se vean rápido.
        "Cache-Control": "public, max-age=5",
      },
    });
  } catch (error) {
    return new Response("Error al obtener el catálogo desde Google Sheets: " + error.message, {
      status: 500,
    });
  }
}