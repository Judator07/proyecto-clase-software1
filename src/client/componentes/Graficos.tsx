/** Gráficos de precios, valor y composición (RF-07, RF-15) con Recharts. */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PuntoSerie } from '../../compartido/tipos';
import { formatearFecha, formatearPct } from '../../dominio/formato';
import type { ComposicionTipo } from '../../dominio/portafolio';
import { NOMBRES_TIPO, type TipoInstrumento } from '../../dominio/reglas';
import type { Estadisticas } from '../../dominio/estadisticas';
import { Vacio } from './ui';

export const COLORES_TIPO: Record<TipoInstrumento, string> = {
  ACCION: '#047857',
  ETF: '#1d4ed8',
  CRIPTO: '#b45309',
  AHORRO: '#7c3aed',
};

const compacto = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 2 });

/**
 * Gráfico de líneas de una serie diaria. Al pasar el cursor o tocar un punto se muestran su fecha y su valor.
 * `formatear` convierte el valor del punto al texto a mostrar.
 */
export function GraficoLinea({
  puntos,
  formatear,
  etiqueta,
  enCentavos = false,
  color = '#047857',
}: {
  puntos: PuntoSerie[];
  formatear: (v: number) => string;
  etiqueta: string;
  /** true si los valores de la serie están en centavos (valor de portafolio). */
  enCentavos?: boolean;
  color?: string;
}) {
  if (puntos.length < 2) {
    return <Vacio>Datos insuficientes para graficar este rango (se necesitan al menos dos puntos).</Vacio>;
  }
  const subiendo = puntos[puntos.length - 1].valor >= puntos[0].valor;
  return (
    <figure aria-label={etiqueta} className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={puntos} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="fecha"
            tickFormatter={formatearFecha}
            minTickGap={40}
            tick={{ fontSize: 12, fill: '#334155' }}
          />
          <YAxis
            domain={['auto', 'auto']}
            width={64}
            tick={{ fontSize: 12, fill: '#334155' }}
            tickFormatter={(v: number) => compacto.format(enCentavos ? v / 100 : v)}
          />
          <Tooltip
            labelFormatter={(f) => formatearFecha(String(f))}
            formatter={(v) => [formatear(Number(v)), etiqueta]}
            contentStyle={{ borderRadius: 8 }}
          />
          <Line
            type="monotone"
            dataKey="valor"
            stroke={subiendo ? color : '#b91c1c'}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}

/** Gráfico circular de la composición del portafolio por tipo de instrumento (RF-15). */
export function GraficoComposicion({ composicion }: { composicion: ComposicionTipo[] }) {
  if (composicion.length === 0) return <Vacio>El portafolio aún no tiene inversiones.</Vacio>;
  const datos = composicion.map((c) => ({ nombre: NOMBRES_TIPO[c.tipo], valor: c.porcentaje, tipo: c.tipo }));
  return (
    <figure aria-label="Composición del portafolio por tipo de instrumento" className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={datos}
            dataKey="valor"
            nameKey="nombre"
            innerRadius="45%"
            outerRadius="80%"
            paddingAngle={2}
            isAnimationActive={false}
          >
            {datos.map((d) => (
              <Cell key={d.tipo} fill={COLORES_TIPO[d.tipo]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatearPct(Number(v))} />
          <Legend
            formatter={(nombre) => `${nombre} (${formatearPct(datos.find((d) => d.nombre === nombre)?.valor ?? 0)})`}
          />
        </PieChart>
      </ResponsiveContainer>
    </figure>
  );
}

/** Barras comparativas del valor actual frente al proyectado (RF-21). */
export function GraficoComparativo({
  datos,
  formatear,
}: {
  datos: { nombre: string; actual: number; proyectado: number }[];
  formatear: (v: number) => string;
}) {
  return (
    <figure aria-label="Comparación del valor actual y el proyectado" className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: '#334155' }} />
          <YAxis
            width={64}
            tick={{ fontSize: 12, fill: '#334155' }}
            tickFormatter={(v: number) => compacto.format(v / 100)}
          />
          <Tooltip formatter={(v, n) => [formatear(Number(v)), n === 'actual' ? 'Valor actual' : 'Valor proyectado']} />
          <Legend formatter={(n) => (n === 'actual' ? 'Valor actual' : 'Valor proyectado')} />
          <Bar dataKey="actual" fill="#64748b" isAnimationActive={false} />
          <Bar dataKey="proyectado" fill="#047857" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}

/** Indicadores de RF-16: rendimiento del periodo, máximo/mínimo, volatilidad y tendencia. */
export function PanelEstadisticas({ e, formatear }: { e: Estadisticas; formatear: (v: number) => string }) {
  const filas: [string, string][] = [
    ['Rendimiento del periodo', formatearPct(e.rendimientoPeriodoPct, true)],
    ['Máximo', e.maximo === null ? 'No disponible' : formatear(e.maximo)],
    ['Mínimo', e.minimo === null ? 'No disponible' : formatear(e.minimo)],
    ['Volatilidad (desv. estándar de rendimientos diarios)', formatearPct(e.volatilidadPct)],
    ['Media móvil de 20 días', e.mediaMovil20 === null ? 'No disponible' : formatear(e.mediaMovil20)],
    ['Tendencia', e.tendencia === null ? 'No disponible' : e.tendencia === 'ALCISTA' ? '▲ Alcista' : '▼ Bajista'],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {filas.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-1.5 text-sm">
          <dt className="text-slate-700">{k}</dt>
          <dd className="font-semibold tabular-nums text-slate-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
