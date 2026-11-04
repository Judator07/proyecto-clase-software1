-- Migración 0002: catálogo inicial de instrumentos (resuelve TBD-3 y TBD-4).
-- Instrumentos de alta liquidez del mercado estadounidense y criptomonedas de mayor capitalización.
-- Los identificadores son explícitos para que la migración de históricos pueda referenciarlos.

INSERT INTO instrumento (id, simbolo, simbolo_proveedor, nombre, tipo, sector, bolsa, indice_subyacente, descripcion) VALUES
  (1,  'AAPL', 'AAPL', 'Apple Inc.',                 'ACCION', 'Tecnología',         'NASDAQ', NULL, 'Fabricante de dispositivos electrónicos y software.'),
  (2,  'MSFT', 'MSFT', 'Microsoft Corporation',      'ACCION', 'Tecnología',         'NASDAQ', NULL, 'Software, servicios en la nube y productos de productividad.'),
  (3,  'GOOGL','GOOGL','Alphabet Inc. (Clase A)',    'ACCION', 'Comunicaciones',     'NASDAQ', NULL, 'Empresa matriz de Google: buscador, publicidad y nube.'),
  (4,  'AMZN', 'AMZN', 'Amazon.com Inc.',            'ACCION', 'Consumo discrecional','NASDAQ', NULL, 'Comercio electrónico y servicios en la nube (AWS).'),
  (5,  'NVDA', 'NVDA', 'NVIDIA Corporation',         'ACCION', 'Tecnología',         'NASDAQ', NULL, 'Procesadores gráficos y chips para inteligencia artificial.'),
  (6,  'TSLA', 'TSLA', 'Tesla Inc.',                 'ACCION', 'Consumo discrecional','NASDAQ', NULL, 'Vehículos eléctricos y almacenamiento de energía.'),
  (7,  'JPM',  'JPM',  'JPMorgan Chase & Co.',       'ACCION', 'Financiero',         'NYSE',   NULL, 'Banco de inversión y servicios financieros.'),
  (8,  'KO',   'KO',   'The Coca-Cola Company',      'ACCION', 'Consumo básico',     'NYSE',   NULL, 'Bebidas no alcohólicas; acción tradicionalmente defensiva.'),
  (9,  'SPY',  'SPY',  'SPDR S&P 500 ETF Trust',     'ETF',    NULL, 'NYSE Arca', 'S&P 500',          'Replica las 500 empresas más grandes de EE. UU.'),
  (10, 'QQQ',  'QQQ',  'Invesco QQQ Trust',          'ETF',    NULL, 'NASDAQ',    'Nasdaq-100',       'Replica las 100 mayores empresas no financieras del Nasdaq.'),
  (11, 'VTI',  'VTI',  'Vanguard Total Stock Market ETF', 'ETF', NULL, 'NYSE Arca', 'CRSP US Total Market', 'Exposición a todo el mercado accionario de EE. UU.'),
  (12, 'EEM',  'EEM',  'iShares MSCI Emerging Markets ETF', 'ETF', NULL, 'NYSE Arca', 'MSCI Emerging Markets', 'Acciones de mercados emergentes.'),
  (13, 'GLD',  'GLD',  'SPDR Gold Shares',           'ETF',    NULL, 'NYSE Arca', 'Precio del oro',   'Sigue el precio del oro físico.'),
  (14, 'BTC',  'BTC-USD', 'Bitcoin',                 'CRIPTO', NULL, NULL, NULL, 'Primera criptomoneda descentralizada; alta volatilidad.'),
  (15, 'ETH',  'ETH-USD', 'Ethereum',                'CRIPTO', NULL, NULL, NULL, 'Plataforma de contratos inteligentes y su moneda nativa.'),
  (16, 'SOL',  'SOL-USD', 'Solana',                  'CRIPTO', NULL, NULL, NULL, 'Cadena de bloques de alto rendimiento.'),
  (17, 'XRP',  'XRP-USD', 'XRP',                     'CRIPTO', NULL, NULL, NULL, 'Moneda orientada a pagos internacionales.'),
  (18, 'ADA',  'ADA-USD', 'Cardano',                 'CRIPTO', NULL, NULL, NULL, 'Cadena de bloques con enfoque académico.'),
  (19, 'AHORRO', NULL,  'Cuenta de ahorro simulada', 'AHORRO', NULL, NULL, NULL, 'Depósito con interés compuesto: tú eliges monto, tasa, plazo y capitalización.');
