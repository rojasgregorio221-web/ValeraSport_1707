// Uso: node verificar-catalogo.js
const URL_CATALOGO = "https://valerasportvzla.com/api/obtener-productos";

const r = await fetch(URL_CATALOGO + "?t=" + Date.now(), {
  headers: { "Cache-Control": "no-cache" },
  cache: "no-store",
});

const texto = await r.text();
const lineas = texto.split("\n").filter((l) => l.trim() !== "");

console.log("Estado HTTP:", r.status);
console.log("Cabecera Cache-Control:", r.headers.get("cache-control"));
console.log("Productos (sin encabezado):", Math.max(0, lineas.length - 1));
console.log("Primeras líneas:");
console.log(lineas.slice(0, 3).join("\n"));