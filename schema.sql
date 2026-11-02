CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto TEXT NOT NULL,
  precio REAL NOT NULL DEFAULT 0,
  categoria TEXT DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  disponible TEXT DEFAULT 'si',
  vendidos INTEGER NOT NULL DEFAULT 0,
  fecha TEXT,
  stock_colores TEXT DEFAULT '',
  stock_variantes TEXT DEFAULT '',
  extra TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT
);

CREATE TABLE IF NOT EXISTS ordenes (
  id_orden TEXT PRIMARY KEY,
  numero_orden INTEGER,
  fecha TEXT,
  estado TEXT DEFAULT 'pendiente',
  metodo_pago TEXT,
  referencia TEXT,
  telefono_pago TEXT,
  correo_cliente TEXT,
  comprobante_url TEXT DEFAULT '',
  motivo TEXT DEFAULT '',
  total REAL DEFAULT 0,
  fecha_rechazo TEXT
);

CREATE TABLE IF NOT EXISTS orden_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_orden TEXT NOT NULL,
  producto TEXT,
  color TEXT DEFAULT '',
  talla TEXT DEFAULT '',
  cantidad INTEGER DEFAULT 1,
  precio_unit REAL DEFAULT 0,
  categoria TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT,
  producto TEXT,
  categoria TEXT,
  precio REAL DEFAULT 0,
  correo_cliente TEXT DEFAULT '',
  canal TEXT,
  precio_bs REAL,
  tasa_bs REAL,
  nota TEXT DEFAULT '',
  metodo_pago TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS fiados (
  id TEXT PRIMARY KEY,
  fecha TEXT,
  cliente TEXT,
  producto TEXT,
  precio REAL DEFAULT 0,
  precio_bs REAL,
  tasa_bs REAL,
  fecha_pago TEXT,
  estado_pago TEXT DEFAULT 'pendiente',
  nota TEXT DEFAULT '',
  correo TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS gastos (
  id TEXT PRIMARY KEY,
  fecha TEXT,
  concepto TEXT,
  monto REAL DEFAULT 0,
  categoria TEXT DEFAULT '',
  nota TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS cashea (
  id TEXT PRIMARY KEY,
  fecha TEXT,
  cliente TEXT,
  producto TEXT,
  total REAL DEFAULT 0,
  inicial REAL DEFAULT 0,
  financiado REAL DEFAULT 0,
  cuotas INTEGER DEFAULT 1,
  cuota_sugerida REAL DEFAULT 0,
  cobros INTEGER DEFAULT 0,
  cobrado_usd REAL DEFAULT 0,
  saldo REAL DEFAULT 0,
  proximo_cobro TEXT,
  estado TEXT DEFAULT 'activo',
  nota TEXT DEFAULT '',
  correo TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS cierre_semanal (
  semana TEXT,
  desde TEXT,
  hasta TEXT,
  prendas INTEGER,
  total_bs REAL,
  total_usd REAL,
  actualizado TEXT
);

CREATE INDEX IF NOT EXISTS idx_items_orden ON orden_items(id_orden);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes(estado, fecha);
CREATE INDEX IF NOT EXISTS idx_ordenes_correo ON ordenes(correo_cliente);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_correo ON ventas(correo_cliente);

INSERT OR IGNORE INTO config (clave, valor) VALUES ('ultimo_numero_orden', '0');