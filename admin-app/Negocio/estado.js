/* Negocio/estado.js · generado por separar-capas.js · el código está igual que en admin.html */
        let tabActiva = 'pedidos';
        let subtabPedidosActiva = 'pendientes';
        let idSolicitudPedidos = 0, idSolicitudAceptadas = 0, idSolicitudRechazadas = 0, idSolicitudVentas = 0, idSolicitudFiados = 0, idSolicitudGastos = 0;
        let peticionPedidosEnCurso = false, peticionAceptadasEnCurso = false, peticionRechazadasEnCurso = false, peticionVentasEnCurso = false, peticionFiadosEnCurso = false, peticionGastosEnCurso = false;

        let productosCatalogo = [];
        let scannerVentaStream = null;
        let scannerVentaRAF = null;

        // Cada prenda: { producto, precio, categoria, cantidad, codigo }
        let carritoFisica = [];
        let aplicarDescuentoMayor = null; // null = sin decidir, true = sí aplicar, false = no aplicar
        let ultimoIndiceEscaneado = -1;
        let ultimoCodigoEscaneado = null;
        let ultimoEscaneoTiempo = 0;
        let scannerVentaPausado = false;
        let scannerVentaTimeoutId = null;

        let itemPendienteConfirmar = null;

        let filtroVentas = 'hoy';
        let fechaVentasElegida = null;
        let filtroMonedaVentas = 'ambas';
        let listaVentasMemoria = [];
        let tasaBcvAdmin = null;
        let ultimoTotalHoy = 0;

        let filtroFiados = 'pendientes';
        let listaFiadosMemoria = [];

        let filtroGastos = 'hoy';
        let listaGastosMemoria = [];

        // ---------- REPASO SEMANA POR SEMANA ----------
        let semanasVisibles = true;

        // ===================================================================
        // VUELTO INTEGRADO EN LA VENTA EN TIENDA
        // Usa el total del carrito y el método de pago que ya están en pantalla.
        // No guarda nada por sí solo: solo saca la cuenta (y deja una línea en la nota).
        // ===================================================================
        let vvModo = null;       // null = automático según el método de pago
        let vvAutoBs = false;    // true = el monto en Bs se llenó solo (pago exacto)
        let vvUltimaTasa = null; // para detectar cuando llega la tasa BCV
        const VV_ELECTRONICOS = ['Pago Móvil', 'Punto de venta', 'Transferencia'];
