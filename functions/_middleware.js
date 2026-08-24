// Se ejecuta en CADA visita al sitio (paginas y /api/*). Si alguien entra sin
// el "www" (ej. escribio "valerasportvzla.com" a mano, o un enlace viejo lo
// trae asi), lo mandamos automaticamente a la version con "www", que es la
// que se dejo como oficial. Asi solo existe un dominio "de verdad" para el
// cliente y para Google, sin importar por cual entren.
const DOMINIO_SIN_WWW = "valerasportvzla.com";
const DOMINIO_OFICIAL = "www.valerasportvzla.com";

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === DOMINIO_SIN_WWW) {
    url.hostname = DOMINIO_OFICIAL;
    return Response.redirect(url.toString(), 308);
  }

  return context.next();
}
