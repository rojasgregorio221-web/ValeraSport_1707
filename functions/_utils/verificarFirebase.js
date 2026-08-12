// Verifica un ID token de Firebase Authentication sin depender de ninguna
// librería externa (Cloudflare Pages Functions no soporta paquetes npm sin
// un paso de build, así que esto usa solo Web Crypto, disponible nativamente).
//
// Uso: const payload = await verificarTokenFirebase(idToken, "tu-proyecto-firebase");
// payload.email trae el correo verificado del usuario.

function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binario = atob(str);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function base64UrlDecodeToString(str) {
  return new TextDecoder().decode(base64UrlDecode(str));
}

export async function verificarTokenFirebase(idToken, projectId) {
  if (!idToken) throw new Error("Falta el token de sesión");
  if (!projectId) throw new Error("Falta configurar el ID del proyecto de Firebase");

  const partes = idToken.split(".");
  if (partes.length !== 3) throw new Error("Token con formato inválido");

  const header = JSON.parse(base64UrlDecodeToString(partes[0]));
  const payload = JSON.parse(base64UrlDecodeToString(partes[1]));
  const firma = base64UrlDecode(partes[2]);
  const datosFirmados = new TextEncoder().encode(partes[0] + "." + partes[1]);

  // Firebase publica sus claves públicas actuales en formato JWK aquí:
  const respuestaClaves = await fetch(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  );
  if (!respuestaClaves.ok) throw new Error("No se pudieron obtener las claves públicas de Firebase");
  const { keys } = await respuestaClaves.json();

  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("No se encontró la clave pública para verificar el token");

  const clavePublica = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const firmaValida = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    clavePublica,
    firma,
    datosFirmados
  );
  if (!firmaValida) throw new Error("Firma del token inválida");

  const ahora = Math.floor(Date.now() / 1000);
  if (payload.exp < ahora) throw new Error("El token expiró, vuelve a iniciar sesión");
  if (payload.iss !== "https://securetoken.google.com/" + projectId) {
    throw new Error("Emisor del token inválido");
  }
  if (payload.aud !== projectId) throw new Error("Audiencia del token inválida");
  if (!payload.email) throw new Error("El token no tiene un correo asociado");

  return payload;
}