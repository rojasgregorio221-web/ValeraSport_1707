// Se ejecuta en CADA visita al sitio (paginas y /api/*). Cualquiera que entre
// por una direccion que NO sea la oficial -- sin "www", o por la URL interna
// fija que Cloudflare Pages le pone al proyecto -- se manda para alla. Asi
// solo existe una direccion "de verdad" para el cliente y para Google, sin
// importar por cual hayan entrado.
//
// A proposito NO se incluyen aqui las URLs de vista previa de cada deploy
// (las que empiezan con un codigo raro, tipo
// "ac60860e.valerasport-1707.pages.dev") -- esas sirven para revisar un
// deploy especifico desde el panel de Cloudflare, y redirigirlas tambien
// rompiria esa funcion. Tampoco afecta "localhost" al probar en la
// computadora.
const DOMINIO_OFICIAL = "www.valerasportvzla.com";
const DOMINIOS_A_REDIRIGIR = new Set([
  "valerasportvzla.com",
  "valerasport-1707.pages.dev",
]);

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (DOMINIOS_A_REDIRIGIR.has(url.hostname)) {
    url.hostname = DOMINIO_OFICIAL;
    return Response.redirect(url.toString(), 308);
  }

  return context.next();
}
