/* Presentacion/login.js · generado por separar-capas.js · el código está igual que en admin.html */
        const formLogin = document.getElementById('formLogin');
        const inputPassword = document.getElementById('inputPassword');
        const errorLogin = document.getElementById('errorLogin');
        const pantallaLogin = document.getElementById('pantallaLogin');
        const panelPrincipal = document.getElementById('panelPrincipal');
        const btnSubmitLogin = document.getElementById('btnSubmitLogin');
        const textoBtnLogin = document.getElementById('textoBtnLogin');
        const spinnerLogin = document.getElementById('spinnerLogin');
        const estadoCargandoLogin = document.getElementById('estadoCargandoLogin');
        const textoEstadoCargando = document.getElementById('textoEstadoCargando');

        // ===================================================================
        function setEstadoCargaLogin(cargando, texto = 'Revisando tu clave...') {
            if (cargando) {
                if (inputPassword) inputPassword.disabled = true;
                if (btnSubmitLogin) btnSubmitLogin.disabled = true;
                if (textoBtnLogin) textoBtnLogin.textContent = 'Entrando...';
                if (spinnerLogin) spinnerLogin.classList.remove('hidden');
                if (estadoCargandoLogin) estadoCargandoLogin.classList.remove('hidden');
                if (textoEstadoCargando && texto) textoEstadoCargando.textContent = texto;
                if (errorLogin) errorLogin.classList.add('hidden');
            } else {
                if (inputPassword) inputPassword.disabled = false;
                if (btnSubmitLogin) btnSubmitLogin.disabled = false;
                if (textoBtnLogin) textoBtnLogin.textContent = 'Entrar al panel';
                if (spinnerLogin) spinnerLogin.classList.add('hidden');
                if (estadoCargandoLogin) estadoCargandoLogin.classList.add('hidden');
            }
        }
