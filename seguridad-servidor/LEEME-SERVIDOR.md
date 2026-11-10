# Blindaje del servidor (/api/admin-pedidos)

Todo lo que hace aplicar-seguridad.js en el navegador se puede saltar con una
herramienta como curl. La seguridad real se decide aquí. En orden de importancia:

## 1. Clave: nunca en texto plano ni comparada con ===
- Guarda solo un hash (scrypt) en variables de entorno, nunca en el código.
- Compara con crypto.timingSafeEqual.

  // Generar el hash UNA vez (terminal):
  //   node -e "const c=require('crypto');const s=c.randomBytes(16);console.log('ADMIN_SALT='+s.toString('hex'));console.log('ADMIN_HASH='+c.scryptSync(process.argv[1],s,64).toString('hex'))" "TuClaveLarga"

  const crypto = require('crypto');
  function claveValida(ingresada) {
    const salt = Buffer.from(process.env.ADMIN_SALT, 'hex');
    const esperado = Buffer.from(process.env.ADMIN_HASH, 'hex');
    const hash = crypto.scryptSync(String(ingresada || '').slice(0, 128), salt, 64);
    return hash.length === esperado.length && crypto.timingSafeEqual(hash, esperado);
  }

- Usa una clave larga (16+ caracteres, frase). Cámbiala si alguna vez se filtró.

## 2. Límite de intentos REAL (por IP, persistente)
El bloqueo del navegador se evita borrando el almacenamiento. En el servidor usa
un contador persistente (Vercel KV / Upstash Redis / Cloudflare KV):
- 5 fallos por IP en 15 min -> responder 429 durante 15-60 min.
- Responder igual de lento a clave buena o mala (evita adivinar por tiempos).

## 3. Sesión con token en vez de enviar la clave en cada petición
Hoy la clave viaja en el cuerpo de CADA petición. Mejor:
- Login: validar la clave UNA vez y emitir un token firmado (HMAC-SHA256) con
  vencimiento de 20 min, guardado en cookie HttpOnly; Secure; SameSite=Strict.
- Las demás peticiones usan la cookie. El JavaScript de la página ya no puede
  leer ninguna credencial, ni siquiera si hubiera un XSS.
- Verificar el token con timingSafeEqual y revocarlo al salir.

## 4. Validar cada petición
- Aceptar solo POST con Content-Type: application/json.
- Comprobar que el encabezado Origin coincida con tu dominio.
- Exigir el encabezado X-Requested-With: vs-admin (lo añade la capa 3).
- Validar tipos y rangos (precio 0-9999, stock entero, textos con largo máximo).
- Lista blanca de acciones: ventaFisica, editarVenta, guardarProducto, etc.
  Cualquier otra -> 400.
- Limitar el tamaño del cuerpo (por ejemplo 100 KB).

## 5. Inyección de fórmulas (si guardas en Google Sheets / Excel)
Un texto como =IMPORTXML(...) o =HYPERLINK(...) en una nota, nombre de cliente o
prenda se ejecuta al abrir la hoja. Antes de escribir una celda, si el texto
empieza por = + - @ tab o retorno, antepón un apóstrofo '.

## 6. Acciones destructivas
- vaciarVentas, rechazar_todos, eliminarProducto: exigir confirmación adicional
  (volver a pedir la clave o un código TOTP) y dejar registro.
- Guardar un registro de auditoría: fecha, IP, acción, resultado.

## 7. Secretos y cuentas
- Credenciales de Google/APIs solo en variables de entorno, con la cuenta de
  servicio limitada a la hoja necesaria (permiso mínimo).
- Activa 2FA en GitHub, Vercel/Netlify, Google y tu correo.
- Revisa que ningún .env quede subido al repositorio (.gitignore).

## 8. Cabeceras HTTP
Aplica las del archivo de esta carpeta que corresponda a tu hosting
(vercel.headers.json, netlify_headers.txt o nginx.snippet.conf). Estas SÍ pueden
usar frame-ancestors, HSTS y Permissions-Policy, que en un <meta> no funcionan.

## 9. Limitación que sigue existiendo en el HTML
El panel usa onclick="..." y scripts en línea, por eso la CSP conserva
'unsafe-inline' en script-src. Para quitarlo habría que mover todo a archivos .js
externos y usar addEventListener (o nonces generados por el servidor). Mientras
tanto, las capas 2-4 + escapeHTML + SRI en las librerías reducen el riesgo.
