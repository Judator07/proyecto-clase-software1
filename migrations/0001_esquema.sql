-- Migración 0001: esquema relacional de la Plataforma de Simulación de Inversión.
-- Convenciones:
--   * Dinero en centavos de USD (INTEGER) para evitar errores de punto flotante.
--   * Cantidades en unidades x 10^8 (INTEGER): cubre los 8 decimales de las criptomonedas (RN-02).
--   * Fechas en texto ISO-8601 UTC.
--   * Las invariantes críticas (RNF-10) se imponen en la propia base de datos con CHECK y TRIGGER.

CREATE TABLE usuario (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre                 TEXT    NOT NULL CHECK (length(nombre) BETWEEN 1 AND 100),
  correo                 TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  hash_contrasena        TEXT    NOT NULL,
  sal                    TEXT    NOT NULL,
  iteraciones            INTEGER NOT NULL,
  rol                    TEXT    NOT NULL DEFAULT 'INVERSIONISTA'
                                 CHECK (rol IN ('INVERSIONISTA', 'ADMINISTRADOR')),
  -- RN-01 y RNF-10: saldo inicial de USD 10.000,00 y nunca negativo.
  saldo_centavos         INTEGER NOT NULL DEFAULT 1000000 CHECK (saldo_centavos >= 0),
  contador_bancarrotas   INTEGER NOT NULL DEFAULT 0 CHECK (contador_bancarrotas >= 0),
  fecha_ultimo_reinicio  TEXT,
  intentos_fallidos      INTEGER NOT NULL DEFAULT 0,
  bloqueado_hasta        TEXT,
  acepto_politica_en     TEXT    NOT NULL,
  creado_en              TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE sesion (
  token_hash  TEXT    PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  expira_en   TEXT    NOT NULL,
  creado_en   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_sesion_usuario ON sesion (usuario_id);

CREATE TABLE instrumento (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  simbolo                 TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  simbolo_proveedor       TEXT,
  nombre                  TEXT    NOT NULL,
  tipo                    TEXT    NOT NULL CHECK (tipo IN ('ACCION', 'ETF', 'CRIPTO', 'AHORRO')),
  descripcion             TEXT,
  sector                  TEXT,
  bolsa                   TEXT,
  indice_subyacente       TEXT,
  activo                  INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  precio_actual           REAL    CHECK (precio_actual IS NULL OR precio_actual > 0),
  precio_cierre_anterior  REAL    CHECK (precio_cierre_anterior IS NULL OR precio_cierre_anterior > 0),
  fecha_actualizacion     TEXT,
  estado_precio           TEXT    NOT NULL DEFAULT 'SIN_DATOS'
                                  CHECK (estado_precio IN ('ACTUALIZADO', 'DESACTUALIZADO', 'SIN_DATOS')),
  ultimo_error            TEXT,
  creado_en               TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_instrumento_tipo ON instrumento (tipo, activo);

CREATE TABLE cotizacion_historica (
  instrumento_id  INTEGER NOT NULL REFERENCES instrumento (id) ON DELETE CASCADE,
  fecha           TEXT    NOT NULL, -- AAAA-MM-DD
  precio_cierre   REAL    NOT NULL CHECK (precio_cierre > 0),
  PRIMARY KEY (instrumento_id, fecha)
) WITHOUT ROWID;

CREATE TABLE portafolio (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id    INTEGER NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  nombre        TEXT    NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 50),
  descripcion   TEXT    CHECK (descripcion IS NULL OR length(descripcion) <= 200),
  creado_en     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  eliminado_en  TEXT
);
-- RN-05: nombres únicos por usuario entre los portafolios no eliminados.
CREATE UNIQUE INDEX ux_portafolio_nombre
  ON portafolio (usuario_id, nombre COLLATE NOCASE) WHERE eliminado_en IS NULL;

-- RN-05: máximo 10 portafolios activos por usuario, impuesto también ante solicitudes concurrentes.
CREATE TRIGGER trg_limite_portafolios
BEFORE INSERT ON portafolio
WHEN (SELECT count(*) FROM portafolio WHERE usuario_id = NEW.usuario_id AND eliminado_en IS NULL) >= 10
BEGIN
  SELECT RAISE(ABORT, 'LIMITE_PORTAFOLIOS');
END;

CREATE TABLE posicion (
  portafolio_id   INTEGER NOT NULL REFERENCES portafolio (id),
  instrumento_id  INTEGER NOT NULL REFERENCES instrumento (id),
  -- RN-04 y RNF-10: nunca se posee una cantidad negativa (sin ventas en corto).
  cantidad_e8     INTEGER NOT NULL CHECK (cantidad_e8 >= 0),
  costo_promedio  REAL    NOT NULL CHECK (costo_promedio >= 0),
  actualizado_en  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (portafolio_id, instrumento_id)
);

CREATE TABLE deposito_ahorro (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  portafolio_id      INTEGER NOT NULL REFERENCES portafolio (id),
  instrumento_id     INTEGER NOT NULL REFERENCES instrumento (id),
  monto_centavos     INTEGER NOT NULL CHECK (monto_centavos > 0),
  tasa_anual_pct     REAL    NOT NULL CHECK (tasa_anual_pct BETWEEN 0 AND 30),
  periodos_por_anio  INTEGER NOT NULL CHECK (periodos_por_anio IN (1, 4, 12)),
  plazo_meses        INTEGER NOT NULL CHECK (plazo_meses BETWEEN 1 AND 120),
  fecha_inicio       TEXT    NOT NULL,
  estado             TEXT    NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'RETIRADO', 'CERRADO')),
  fecha_cierre       TEXT
);
CREATE INDEX idx_deposito_portafolio ON deposito_ahorro (portafolio_id, estado);

CREATE TABLE transaccion (
  id                           INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id                   INTEGER NOT NULL REFERENCES usuario (id),
  portafolio_id                INTEGER REFERENCES portafolio (id),
  instrumento_id               INTEGER REFERENCES instrumento (id),
  deposito_id                  INTEGER REFERENCES deposito_ahorro (id),
  tipo                         TEXT    NOT NULL CHECK (tipo IN ('COMPRA', 'VENTA', 'DEPOSITO', 'RETIRO')),
  estado                       TEXT    NOT NULL CHECK (estado IN ('EJECUTADA', 'RECHAZADA', 'CANCELADA')),
  cantidad_e8                  INTEGER,
  precio_unitario              REAL,
  monto_centavos               INTEGER NOT NULL DEFAULT 0,
  ganancia_realizada_centavos  INTEGER,
  motivo                       TEXT,
  creado_en                    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_transaccion_usuario ON transaccion (usuario_id, creado_en);
CREATE INDEX idx_transaccion_portafolio ON transaccion (portafolio_id, creado_en);

CREATE TABLE valoracion_portafolio (
  portafolio_id               INTEGER NOT NULL REFERENCES portafolio (id),
  fecha                       TEXT    NOT NULL, -- AAAA-MM-DD
  valor_centavos              INTEGER NOT NULL,
  capital_invertido_centavos  INTEGER NOT NULL,
  PRIMARY KEY (portafolio_id, fecha)
) WITHOUT ROWID;

CREATE TABLE contenido_educativo (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT    NOT NULL UNIQUE,
  titulo          TEXT    NOT NULL CHECK (length(titulo) BETWEEN 1 AND 150),
  tema            TEXT    NOT NULL CHECK (tema IN ('CONCEPTOS_BASICOS', 'RIESGO', 'RENDIMIENTO',
                                                    'DIVERSIFICACION', 'INTERES_COMPUESTO', 'CRIPTOMONEDAS')),
  resumen         TEXT    NOT NULL,
  cuerpo          TEXT    NOT NULL CHECK (length(cuerpo) > 0),
  estado          TEXT    NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'PUBLICADO')),
  autor_id        INTEGER REFERENCES usuario (id),
  creado_en       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actualizado_en  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  publicado_en    TEXT
);
CREATE INDEX idx_contenido_tema ON contenido_educativo (tema, estado);
