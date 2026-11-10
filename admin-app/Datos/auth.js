/* Datos/auth.js · generado por separar-capas.js · el código está igual que en admin.html */
        async function probarPassword(clave) {
            try {
                const resp = await fetch('/api/admin-pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: clave, tipo: 'pedidos' })
                });
                if (resp.status === 401) return { valida: false };
                if (resp.status === 429) {
                    const datos = await resp.json().catch(() => ({}));
                    return { valida: false, mensaje: datos.error || 'Muchos intentos seguidos. Espera un momento.' };
                }
                return { valida: true };
            } catch (e) {
                return { valida: false, mensaje: 'No se pudo conectar con el servidor.' };
            }
        }
