/* Seguridad/sesion.js · generado por separar-capas.js · el código está igual que en admin.html */
        function obtenerPassword() {
            const ultimaActividad = Number(sessionStorage.getItem(ACTIVIDAD_KEY) || 0);
            if (ultimaActividad && Date.now() - ultimaActividad > MINUTOS_INACTIVIDAD * 60000) {
                setTimeout(expirarSesion, 0);
                return '';
            }
            return sessionStorage.getItem(PASSWORD_KEY) || '';
        }

        /* ---- seguridad:capa1 · cierre por inactividad ---- */
        let _expirando = false;
        function expirarSesion() {
            if (_expirando) return;
            _expirando = true;
            try { cerrarSesion(); } catch (e) {}
            const er = document.getElementById('errorLogin');
            if (er) { er.textContent = 'Por seguridad, la sesión se cerró por inactividad. Entra de nuevo.'; er.className = 'msg msg-warn'; }
            setTimeout(() => { _expirando = false; }, 1000);
        }
        const marcarActividad = () => { if (sessionStorage.getItem(PASSWORD_KEY)) sessionStorage.setItem(ACTIVIDAD_KEY, String(Date.now())); };
        let _ultimoToque = 0;
