/* Presentacion/qr.js · generado por separar-capas.js · el código está igual que en admin.html */
        function generarQRNuevo() {
            const codigo = document.getElementById('qrCodigo').value.trim();
            const nombreProducto = document.getElementById('qrNombreProducto').value.trim();
            const mensaje = document.getElementById('mensajeQR');
            const resultado = document.getElementById('resultadoQR');
            mensaje.classList.add('hidden');
            resultado.classList.add('hidden');

            if (!codigo) {
                mensaje.textContent = 'Escribe primero un código.';
                mensaje.className = 'msg msg-error';
                return;
            }

            const yaExiste = productosCatalogo.some(p => (p.codigo || '').toLowerCase().trim() === codigo.toLowerCase());
            if (yaExiste) {
                mensaje.textContent = 'Ojo: ese código ya está puesto en otra prenda del Sheet.';
                mensaje.className = 'msg msg-warn';
            }

            try {
                const contenedor = document.getElementById('canvasQR');
                contenedor.innerHTML = '';
                const urlQR = 'https://www.valerasportvzla.com/catalogo?codigo=' + encodeURIComponent(codigo);
                new QRCode(contenedor, { text: urlQR, width: 220, height: 220 });
                document.getElementById('etiquetaQR').textContent = codigo + (nombreProducto ? ' — ' + nombreProducto : '');
                resultado.classList.remove('hidden');
            } catch (error) {
                mensaje.textContent = 'No se pudo crear el QR: ' + error.message;
                mensaje.className = 'msg msg-error';
            }
        }

        function imprimirQR() {
    const contenedor = document.getElementById('canvasQR');
    const canvas = contenedor.querySelector('canvas');
    const imgSrc = canvas ? canvas.toDataURL() : (contenedor.querySelector('img') || {}).src;
    if (!imgSrc) { alert('No se pudo preparar el QR para imprimir.'); return; }

    const etiqueta = document.getElementById('qrCodigo').value.trim();
    const ventana = window.open('', '_blank');
    if (!ventana) { alert('El navegador bloqueó la ventana. Permite las ventanas emergentes.'); return; }
    ventana.document.write(
        '<html><head><title>Imprimir QR</title></head>' +
        '<body style="text-align:center; font-family:Arial, sans-serif; padding-top:40px;">' +
        '<img src="' + imgSrc + '" style="width:220px;">' +
        '<p style="font-weight:bold; font-size:16px;">' + escapeHTML(etiqueta) + '</p>' +
        '<script>window.onload = function () { window.print(); };<\/script>' +
        '</body></html>'
    );
    ventana.document.close();
}
