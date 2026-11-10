/* Seguridad/sanitizar.js · generado por separar-capas.js · el código está igual que en admin.html */
        function escapeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str == null ? '' : String(str);
            return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');   /* seguridad:capa3 */
        }
