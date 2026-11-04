/** Componentes de interfaz reutilizables. Colores con contraste WCAG 2.1 AA (RNF-12). */
import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

export function cx(...clases: (string | false | null | undefined)[]) {
  return clases.filter(Boolean).join(' ');
}

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-emerald-700/60',
  secundario: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
  peligro: 'bg-red-700 text-white hover:bg-red-800',
  fantasma: 'text-emerald-800 hover:bg-emerald-50',
};

export function Boton({
  variante = 'primario',
  className,
  cargando,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; cargando?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || cargando}
      className={cx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed',
        VARIANTES[variante],
        className,
      )}
    >
      {cargando && (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      )}
      {children}
    </button>
  );
}

interface PropsCampo {
  etiqueta: string;
  error?: string | null;
  ayuda?: ReactNode;
}

export function Campo({
  etiqueta,
  error,
  ayuda,
  id,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & PropsCampo) {
  const idCampo = id ?? props.name;
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={idCampo} className="text-sm font-medium text-slate-800">
        {etiqueta}
      </label>
      <input
        id={idCampo}
        aria-invalid={!!error}
        aria-describedby={error ? `${idCampo}-error` : undefined}
        className={cx(
          'min-h-10 rounded-lg border bg-white px-3 py-2 text-slate-900 focus:outline-2 focus:outline-emerald-700',
          error ? 'border-red-700' : 'border-slate-400',
        )}
        {...props}
      />
      {ayuda && !error && <p className="text-xs text-slate-600">{ayuda}</p>}
      {error && (
        <p id={`${idCampo}-error`} className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Selector({
  etiqueta,
  id,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string }) {
  const idCampo = id ?? props.name;
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={idCampo} className="text-sm font-medium text-slate-800">
        {etiqueta}
      </label>
      <select
        id={idCampo}
        className="min-h-10 rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 focus:outline-2 focus:outline-emerald-700"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Tarjeta({
  titulo,
  acciones,
  children,
  className,
}: {
  titulo?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5', className)}>
      {(titulo || acciones) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>}
          {acciones}
        </div>
      )}
      {children}
    </section>
  );
}

type TipoAlerta = 'info' | 'exito' | 'error' | 'advertencia';
const ALERTAS: Record<TipoAlerta, string> = {
  info: 'border-sky-300 bg-sky-50 text-sky-900',
  exito: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  error: 'border-red-300 bg-red-50 text-red-900',
  advertencia: 'border-amber-300 bg-amber-50 text-amber-900',
};

export function Alerta({
  tipo = 'info',
  children,
  className,
}: {
  tipo?: TipoAlerta;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={cx('rounded-lg border px-4 py-3 text-sm', ALERTAS[tipo], className)}
    >
      {children}
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-700" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" aria-hidden />
      {texto}
    </div>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-slate-700">{children}</p>
  );
}

export function Insignia({
  children,
  tono = 'gris',
}: {
  children: ReactNode;
  tono?: 'gris' | 'verde' | 'rojo' | 'ambar' | 'azul';
}) {
  const tonos = {
    gris: 'bg-slate-100 text-slate-800',
    verde: 'bg-emerald-100 text-emerald-900',
    rojo: 'bg-red-100 text-red-900',
    ambar: 'bg-amber-100 text-amber-900',
    azul: 'bg-sky-100 text-sky-900',
  };
  return (
    <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', tonos[tono])}>
      {children}
    </span>
  );
}

/** Texto con color según el signo (ganancia en verde, pérdida en rojo). */
export function ConSigno({ valor, children }: { valor: number | null; children: ReactNode }) {
  const color = valor === null || valor === 0 ? 'text-slate-800' : valor > 0 ? 'text-emerald-800' : 'text-red-700';
  return <span className={cx('font-semibold tabular-nums', color)}>{children}</span>;
}

export function Indicador({ etiqueta, valor, detalle }: { etiqueta: string; valor: ReactNode; detalle?: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-700">{etiqueta}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">{valor}</p>
      {detalle && <p className="mt-1 text-sm">{detalle}</p>}
    </div>
  );
}

/** Diálogo modal accesible basado en <dialog>. */
export function Dialogo({
  abierto,
  titulo,
  onCerrar,
  children,
}: {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);
  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      aria-labelledby="titulo-dialogo"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl p-0 shadow-xl backdrop:bg-slate-900/50"
    >
      <div className="p-5">
        <h2 id="titulo-dialogo" className="mb-3 text-lg font-semibold text-slate-900">
          {titulo}
        </h2>
        {children}
      </div>
    </dialog>
  );
}

export function Pestanas<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
}: {
  opciones: { valor: T; texto: string }[];
  valor: T;
  onCambio: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={valor === o.valor}
          onClick={() => onCambio(o.valor)}
          className={cx(
            'min-h-9 rounded-md px-3 text-sm font-medium',
            valor === o.valor ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-700 hover:text-slate-900',
          )}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

export function Titulo({
  children,
  subtitulo,
  acciones,
}: {
  children: ReactNode;
  subtitulo?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{children}</h1>
        {subtitulo && <p className="mt-1 text-slate-700">{subtitulo}</p>}
      </div>
      {acciones}
    </div>
  );
}
