import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos.css';

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-16">
        <h1 className="text-3xl font-bold text-emerald-900">Plataforma de Simulación de Inversión</h1>
        <p className="text-lg">
          Aprende a invertir en acciones, ETF, criptomonedas y cuentas de ahorro sin arriesgar dinero real.
        </p>
        <p className="text-sm text-slate-600">Versión en construcción.</p>
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-700">
        Plataforma de simulación con fines educativos. No usa dinero real ni constituye asesoría financiera.
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
