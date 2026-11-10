/* Config/version.js · generado por separar-capas.js · el código está igual que en admin.html */
        // ===================================================================
        // VERSIÓN DEL SISTEMA
        // Cada cambio nuevo se anota ARRIBA de esta lista. La primera entrada
        // es siempre la versión actual: se ve en el encabezado, en el pie del
        // acceso y en el apartado "Versión".
        // tipo: 'Novedad' | 'Mejora' | 'Arreglo' | 'Base'
        // ===================================================================
        const HISTORIAL_VERSIONES = [
            {
                numero: '6.8.0', fecha: '2026-11-07', tipo: 'Novedad',
                titulo: 'Varias fotos por prenda',
                cambios: [
                    'Inventario: el campo Imagen acepta varias fotos, una por línea o separadas por espacio.',
                    'La vista previa muestra todas las fotos y avisa cuál no carga.',
                    'En el catálogo la prenda se abre con carrusel de fotos y los colores muestran su tono.'
                ]
            },
            {
                numero: '6.7.1', fecha: '2026-11-07', tipo: 'Mejora',
                titulo: 'Cashea cuenta en Ventas y editar ventas',
                cambios: [
                    'Las ventas con Cashea vuelven a sumarse en Ventas, Semana por semana y el Reporte en PDF. Solo quedan fuera del resumen de la pantalla principal (Bs y $), donde se siguen en Cobros Cashea.',
                    'Editar una venta ya hecha: un lápiz discreto en cada venta para cambiar el producto, el precio de cada prenda o el total.'
                ]
            },
            {
                numero: '6.7.0', fecha: '2026-11-07', tipo: 'Novedad',
                titulo: 'Cashea al 15%, cobros netos y ventas por fecha',
                cambios: [
                    'Cashea ahora usa 15% (antes 21%): cambian los precios con Cashea y la lista de precios.',
                    'Cobros Cashea muestra lo que de verdad te queda: al monto que muestra Cashea se le descuenta el 15% (ejemplo: $25.00 pasa a $21.25).',
                    'Las ventas con Cashea ya no se suman en Bolívares ni en Divisas, ni en el resumen de hoy ni en Ventas: quedan solo en Cobros Cashea.',
                    'Ventas: nueva opción «Otro día» con flechas y calendario para ver las ventas de cualquier fecha del año.',
                    'Reporte en PDF y Semana por semana ahora vienen cerrados y se abren al tocarlos.'
                ]
            },
            {
                numero: '6.6.0', fecha: '2026-11-02', tipo: 'Novedad',
                titulo: 'Inventario con stock, colores y tallas',
                cambios: [
                    'Nueva pantalla Inventario en el menú: agregar, editar y borrar prendas.',
                    'Stock con botones de sumar y restar, avisos de stock bajo y agotado.',
                    'Colores y tallas por prenda, con revisión del formato antes de guardar.',
                    'Arreglo: imprimir QR ya no lleva código pegado dentro del script.'
                ]
            },
            {
                numero: '6.5.0', fecha: '2026-11-02', tipo: 'Arreglo',
                titulo: 'Inventario en el panel y arreglo del script cortado',
                cambios: [
                    'Arreglo: la etiqueta del inventario quedó dentro de la función de imprimir QR y cortaba el script del panel, mostrando código como texto. Ahora está al final del archivo, fuera de cualquier script.',
                    'Arreglo: el inventario no se enganchaba al menú porque buscaba PANELES_ACCION en window; ahora lo usa directo.',
                    'Mejora: nueva pantalla Inventario en el menú para agregar, editar y borrar prendas directo en la base de datos.',
                    'Mejora: al guardar se revisa nombre, precio, stock y el formato de colores y tallas antes de enviar.'
                ]
            },
            {
                numero: '6.2.0', fecha: '2026-10-28', tipo: 'Mejora',
                titulo: 'Vender en la tienda: la prenda se suma sola',
                cambios: [
                    'Ya no hay botón de sumar: al escribir nombre y precio la prenda se agrega sola y aparecen las formas de pago.',
                    'Si eliges una prenda del catálogo se suma al instante, y al tocar Cobrar no se pierde ninguna prenda escrita.',
                    'Pantalla más compacta, con el plan Cashea más corto.'
                ]
            },
            {
                numero: '6.1.0', fecha: '2026-10-28', tipo: 'Mejora',
                titulo: 'Vender en la tienda, más simple',
                cambios: [
                    'La venta empieza solo con escanear o escribir la prenda; el cobro aparece cuando hay una prenda.',
                    'La forma de pago ahora son botones grandes: bolívares, dólares, Cashea y fiado.',
                    'Cashea: eliges el % de inicial con un toque y ves solo lo que paga hoy y lo que financia Cashea.',
                    'Correo y nota quedaron en «Más datos» y el botón de guardar queda siempre a la mano.'
                ]
            },
            {
                numero: '6.0.0', fecha: '2026-10-28', tipo: 'Arreglo',
                titulo: 'Arreglo: el panel vuelve a abrir',
                cambios: [
                    'El panel no abría porque un bloque de código quedó pegado dentro de la función de imprimir QR y cortaba el script.',
                    'Ya está en su lugar: el acceso, el menú lateral, Cashea y la lista de precios funcionan de nuevo.'
                ]
            },
            {
                numero: '4.5', fecha: '2026-10-28', tipo: 'Arreglo',
                titulo: 'Arreglo: descarga del PDF',
                cambios: [
                    'Ya se descarga el PDF de la lista de precios, con el logo arriba.',
                    'El reporte de ventas en PDF volvió a funcionar.'
                ]
            },
            {
                numero: '4.4', fecha: '2026-10-28', tipo: 'Mejora',
                titulo: 'Logo en el PDF de la lista de precios',
                cambios: [
                    'El PDF de la lista de precios ahora lleva el logo de Valera Sport arriba, centrado.',
                    'El título y la fecha quedaron centrados debajo del logo.'
                ]
            },
            
            {
                numero: '4.3', fecha: '2026-10-26', tipo: 'Novedad',
                titulo: 'Cashea y lista de precios',
                cambios: [
                    'Nueva forma de pago «Cashea» en Vender en la tienda: cada prenda se recalcula sola y la venta queda anotada con base y recargo.',
                    'Nueva pantalla «Lista de precios» en el menú: precio normal y precio Cashea en vivo, con buscador y filtros.',
                    'Descarga el PDF con los precios actualizados (normal, Cashea o ambos).'
                ]
            },
{
                numero: '4.2', fecha: '2026-10-25', tipo: 'Mejora',
                titulo: 'Transición rápida y mensaje del día',
                cambios: [
                    'La transición Persiana es mucho más rápida: las opciones aparecen casi al instante.',
                    'El inicio muestra un mensaje minimalista que cambia cada día.',
                    'Se devolvieron a como estaban los desenfoques, las ventanas y los refrescos del panel.'
                ]
            },
            {
                numero: '4.1', fecha: '2026-10-25', tipo: 'Novedad',
                titulo: 'Inicio limpio y una ventana para cada módulo',
                cambios: [
                    'El inicio quedó limpio: solo el resumen de hoy. Lo demás se abre desde el menú de las tres rayitas.',
                    'Pedidos, Ventas, Fiado y Gastos ahora tienen su propia ventana, igual que Vender en la tienda.',
                    'Vender, Escanear y Crear QR pasaron al menú, junto con los avisos de pedidos y fiados vencidos.',
                    'Transición nueva «Persiana» entre todas las ventanas, y el panel pesa menos para ir más fluido.'
                ]
            },
            {
                numero: '4.0.1', fecha: '2026-10-25', tipo: 'Arreglo',
                titulo: 'Encabezado fijo arriba',
                cambios: [
                    'Arreglo: el encabezado (VALERASPORT) ahora queda FIJO arriba al bajar,    pegado al borde (sin hueco por donde se vea el contenido) y se hace más    pequeño al desplazarse para no tapar.'
                ]
            },
            {
                numero: '4.0.0', fecha: '2026-10-25', tipo: 'Novedad',
                titulo: 'Panel nuevo',
                cambios: [
                    'Menú lateral nuevo: toca las tres rayitas de arriba para ir a Pedidos, Ventas, Fiado, Gastos y Versión.',
                    'Operaciones rápidas en tarjetas grandes: vender, escanear y crear QR.',
                    'Avisos de pedidos por revisar y fiados vencidos, y la tasa BCV siempre a la vista.',
                    'Resumen de hoy en un bloque cian con saludo, y todo el panel con diseño más limpio.',
                    'Cada versión nueva muestra un aviso corto que se quita con la X.'
                ]
            },
            {
                numero: '1.3.0', fecha: '2026-10-20', tipo: 'Novedad',
                titulo: 'Reporte de ventas en PDF',
                cambios: [
                    'Nuevo bloque «Reporte en PDF» en Ventas: hoy, esta semana, semana pasada, un día, una semana o entre dos fechas.',
                    'El PDF trae el total por moneda (sin convertir una en otra), resumen por día y el detalle de cada venta.'
                ]
            },
            {
                numero: '1.2.1', fecha: '2026-10-12', tipo: 'Mejora',
                titulo: 'El logo se vuelve línea',
                cambios: [
                    'Al desplegar el menú, el logo de la V se aplasta hasta volverse una línea.',
                    'Al tocar la línea otra vez, vuelve a ser el logo y el menú se recoge.'
                ]
            },
            {
                numero: '1.2.0', fecha: '2026-10-12', tipo: 'Novedad',
                titulo: 'Apartado de versión y logo en el menú',
                cambios: [
                    'Nuevo apartado Versión: toca el número junto a «Panel de la tienda» para verlo.',
                    'Historial de cambios: cada mejora queda anotada con su fecha.',
                    'La V del menú de acciones ahora es el mismo logo del inicio y se abre en dos al desplegarse.'
                ]
            },
            {
                numero: '1.1.0', fecha: '2026-10-12', tipo: 'Novedad',
                titulo: 'Menú de acciones con la V',
                cambios: [
                    'Las tres tarjetas se cambiaron por una V minimalista que se despliega con animación.',
                    'Vender en la tienda, Escanear una prenda y Crear un código QR entran cada una con su propia animación.'
                ]
            },
            {
                numero: '1.0.1', fecha: '2026-10-12', tipo: 'Arreglo',
                titulo: 'Acceso al panel',
                cambios: [
                    'Se quitó la mascota antigua que dejaba el acceso trabado en «Entrando...».'
                ]
            },
            {
                numero: '1.0.0', fecha: '', tipo: 'Base',
                titulo: 'Panel de la tienda',
                cambios: [
                    'Pedidos por revisar, aceptados y rechazados.',
                    'Ventas con resumen por moneda y semana por semana, fiado y gastos.',
                    'Venta en la tienda con escáner de QR, precio al mayor y calculadora de vuelto.'
                ]
            }
        ];
        const VERSION_SISTEMA = HISTORIAL_VERSIONES[0];
