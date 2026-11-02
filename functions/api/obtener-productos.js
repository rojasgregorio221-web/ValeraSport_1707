import { catalogoCSV } from "../_utils/d1.js";

const cabeceras = () => ({
  "Content-Type": "text/csv; charset=utf-8",
  "Cache-Control": "no-store",
});

export async function onRequestGet(context) {
  try {
    const csv = await catalogoCSV(context.env);
    return new Response(csv, { status: 200, headers: cabeceras() });
  } catch (error) {
    return new Response("Error al obtener el catálogo: " + error.message, { status: 500 });
  }
}