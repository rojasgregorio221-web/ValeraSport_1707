// agregar-imagen.js
// Pone la URL de una imagen en un producto de la base D1 (tabla productos, columna extra).
//
// USO (en la terminal de VS Code, dentro de la carpeta del proyecto):
//   node agregar-imagen.js <id> "<url>"
//   node agregar-imagen.js 10 "https://tu-sitio.com/foto.jpg"
//
// Otros comandos:
//   node agregar-imagen.js ver 10        -> muestra el producto 10
//   node agregar-imagen.js buscar biker  -> busca productos por nombre/código y muestra su id
//   node agregar-imagen.js quitar 10     -> deja la imagen del producto 10 vacía
//
// BASE DE DATOS: el script usa, en este orden:
//   1) la variable de entorno D1_DB
//   2) database_name de tu wrangler.toml / wrangler.json / wrangler.jsonc
//   3) el valor de NOMBRE_BASE de aquí abajo
const NOMBRE_BASE = 'valera';

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function nombreDeBase() {
    if (process.env.D1_DB) return process.env.D1_DB;
    for (const f of ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc']) {
        try {
            const txt = fs.readFileSync(path.join(process.cwd(), f), 'utf8');
            const m = txt.match(/database_name["']?\s*[:=]\s*["']([^"']+)["']/);
            if (m) return m[1];
        } catch (e) { /* no existe ese archivo */ }
    }
    return NOMBRE_BASE;
}

function limpiarTexto(s) {
    return String(s).replace(/'/g, "''").replace(/[\r\n]+/g, ' ');
}

function ejecutarSQL(sql) {
    const base = nombreDeBase();
    const archivo = path.join(os.tmpdir(), 'vs-sql-' + Date.now() + '.sql');
    fs.writeFileSync(archivo, sql, 'utf8');
    try {
        const salida = execSync('npx wrangler d1 execute "' + base + '" --remote --file="' + archivo + '"', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            maxBuffer: 20 * 1024 * 1024
        });
        return salida;
    } catch (e) {
        const detalle = (e.stderr || '') + (e.stdout || '') || e.message;
        console.error('\nERROR al hablar con la base "' + base + '":\n' + detalle);
        console.error('Revisa: 1) que hayas hecho "npx wrangler login"  2) que el nombre de la base sea correcto (D1_DB o NOMBRE_BASE).');
        process.exit(1);
    } finally {
        try { fs.unlinkSync(archivo); } catch (e) { /* nada */ }
    }
}

function pedirId(valor) {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0) {
        console.error('Falta el id del producto (un número). Ejemplo: node agregar-imagen.js 10 "https://..."');
        process.exit(1);
    }
    return id;
}

function validarUrl(entrada) {
    let url = String(entrada || '').trim().replace(/^["']|["']$/g, '');
    if (/%[0-9A-Fa-f]{2}/.test(url)) {
        try { url = decodeURIComponent(url); } catch (e) { /* se deja como viene */ }
    }
    if (!/^https:\/\/[^\s]+\.(jpg|jpeg|png|webp|gif|avif)(\?[^\s]*)?$/i.test(url)) {
        console.error('La URL no sirve. Debe empezar con https:// y terminar en .jpg, .png o .webp');
        console.error('Recibida: ' + url);
        process.exit(1);
    }
    return url;
}

const SET_IMAGEN = (valor) =>
    "UPDATE productos SET extra = json_set(CASE WHEN json_valid(extra) THEN extra ELSE '{}' END, '$.imagen', '" + valor + "')";

const a1 = process.argv[2];
const a2 = process.argv[3];

if (!a1) {
    console.log('Uso:\n  node agregar-imagen.js <id> "<url>"\n  node agregar-imagen.js ver <id>\n  node agregar-imagen.js buscar <texto>\n  node agregar-imagen.js quitar <id>');
    process.exit(0);
}

if (a1 === 'buscar') {
    if (!a2) { console.error('Escribe qué buscar. Ejemplo: node agregar-imagen.js buscar biker'); process.exit(1); }
    const q = limpiarTexto(a2).toLowerCase();
    console.log(ejecutarSQL(
        "SELECT * FROM productos WHERE lower(COALESCE(extra,'')) LIKE '%" + q + "%' OR lower(COALESCE(nombre,'')) LIKE '%" + q + "%' LIMIT 20;"
    ));
    process.exit(0);
}

if (a1 === 'ver') {
    const id = pedirId(a2);
    console.log(ejecutarSQL('SELECT id, extra FROM productos WHERE id = ' + id + ';'));
    process.exit(0);
}

if (a1 === 'quitar') {
    const id = pedirId(a2);
    ejecutarSQL(SET_IMAGEN('') + ' WHERE id = ' + id + ';');
    console.log(ejecutarSQL("SELECT id, json_extract(extra, '$.imagen') AS imagen FROM productos WHERE id = " + id + ';'));
    console.log('Imagen quitada del producto ' + id);
    process.exit(0);
}

const id = pedirId(a1);
const url = validarUrl(a2);

const salida = ejecutarSQL(
    SET_IMAGEN(limpiarTexto(url)) + ' WHERE id = ' + id + ';\n' +
    "SELECT id, json_extract(extra, '$.imagen') AS imagen FROM productos WHERE id = " + id + ';'
);
console.log(salida);
console.log('Listo: imagen guardada en el producto ' + id + '. Abre el catálogo con Ctrl+F5 para verla.');