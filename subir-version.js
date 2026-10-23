#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Sube la versión del panel (admin.html) y la anota en el historial.
//
//   node subir-version.js <tipo> "Título corto" "Qué cambió 1" "Qué cambió 2" ...
//
//   tipo:  novedad  -> función nueva           (1.2.1 -> 1.3.0)
//          mejora   -> ajuste o mejora         (1.2.1 -> 1.2.2)
//          arreglo  -> corrección de un error  (1.2.1 -> 1.2.2)
//
//   Ejemplo:
//   node subir-version.js mejora "Botones más grandes" "Los botones de Gastos son más fáciles de tocar."
//
//   Opciones:  --prueba           muestra lo que haría, sin cambiar nada
//              --archivo ruta     si admin.html no está donde lo busca
// ---------------------------------------------------------------------------
const fs = require('fs');

const TIPOS = { novedad: 'Novedad', mejora: 'Mejora', arreglo: 'Arreglo' };

function salir(mensaje, codigo) {
    console.log(mensaje);
    process.exit(codigo);
}

const AYUDA = [
    'Uso:  node subir-version.js <novedad|mejora|arreglo> "Título corto" "Qué cambió 1" "Qué cambió 2" ...',
    'Ejemplo:  node subir-version.js mejora "Botones más grandes" "Los botones de Gastos se tocan mejor."',
    'Opciones: --prueba (solo mostrar)   --archivo ruta/admin.html'
].join('\n');

const args = process.argv.slice(2);
let archivo = null;
let prueba = false;
const resto = [];
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--archivo') archivo = args[++i];
    else if (args[i] === '--prueba') prueba = true;
    else if (args[i] === '--ayuda' || args[i] === '-h') salir(AYUDA, 0);
    else resto.push(args[i]);
}

const tipo = TIPOS[(resto[0] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')];
const titulo = (resto[1] || '').trim();
if (!tipo || !titulo) salir('Falta el tipo o el título.\n\n' + AYUDA, 1);
const cambios = resto.slice(2).map(c => c.trim()).filter(Boolean);
if (!cambios.length) cambios.push(titulo);

const candidatos = [archivo, 'admin.html', 'public/admin.html', 'src/admin.html', 'static/admin.html'].filter(Boolean);
const ruta = candidatos.find(r => fs.existsSync(r));
if (!ruta) salir('No encuentro admin.html. Ábrelo desde la carpeta del proyecto o usa --archivo ruta/admin.html', 1);

const texto = fs.readFileSync(ruta, 'utf8');
const NL = texto.includes('\r\n') ? '\r\n' : '\n';

const inicio = texto.match(/const HISTORIAL_VERSIONES = \[\r?\n/);
if (!inicio) salir('No encontré HISTORIAL_VERSIONES dentro de ' + ruta + '. ¿Es el admin.html con el apartado de versión?', 1);
const despues = inicio.index + inicio[0].length;

const actual = texto.slice(despues).match(/numero:\s*'(\d+)\.(\d+)\.(\d+)'/);
if (!actual) salir('No pude leer la versión actual del historial.', 1);
let [mayor, menor, parche] = [Number(actual[1]), Number(actual[2]), Number(actual[3])];
const anterior = mayor + '.' + menor + '.' + parche;
if (tipo === 'Novedad') { menor += 1; parche = 0; } else { parche += 1; }
const nueva = mayor + '.' + menor + '.' + parche;

const h = new Date();
const fecha = h.getFullYear() + '-' + String(h.getMonth() + 1).padStart(2, '0') + '-' + String(h.getDate()).padStart(2, '0');

const esc = t => String(t).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/<\//g, '<\\/').replace(/\r?\n/g, ' ');
const entrada = [
    '            {',
    "                numero: '" + nueva + "', fecha: '" + fecha + "', tipo: '" + tipo + "',",
    "                titulo: '" + esc(titulo) + "',",
    '                cambios: [',
    cambios.map(c => "                    '" + esc(c) + "'").join(',' + NL),
    '                ]',
    '            },'
].join(NL) + NL;

console.log('Versión ' + anterior + '  ->  ' + nueva + '  (' + tipo + ', ' + fecha + ')');
console.log('  ' + titulo);
cambios.forEach(c => console.log('   - ' + c));

if (prueba) salir('\n(Prueba: no se cambió nada.)', 0);

fs.writeFileSync(ruta, texto.slice(0, despues) + entrada + texto.slice(despues), 'utf8');
console.log('\nListo. Anotado en ' + ruta + ' (apartado Versión del panel).');
