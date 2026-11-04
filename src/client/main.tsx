import { lazy, StrictMode, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { Layout } from './componentes/Layout';
import { Cargando } from './componentes/ui';
import Inicio from './paginas/Inicio';
import { Ingreso, Registro } from './paginas/Acceso';
import { ProveedorSesion, RutaPrivada } from './sesion';
import './estilos.css';

// Las pantallas con gráficos se cargan bajo demanda para que la primera carga sea liviana (RNF-01).
const Panel = lazy(() => import('./paginas/Panel'));
const Perfil = lazy(() => import('./paginas/Perfil'));
const Instrumentos = lazy(() => import('./paginas/Instrumentos'));
const DetalleInstrumento = lazy(() => import('./paginas/DetalleInstrumento'));
const DetallePortafolio = lazy(() => import('./paginas/DetallePortafolio'));
const Ahorro = lazy(() => import('./paginas/Ahorro'));
const Escenarios = lazy(() => import('./paginas/Escenarios'));
const Aprende = lazy(() => import('./paginas/Aprende'));
const Articulo = lazy(() => import('./paginas/Articulo'));
const Admin = lazy(() => import('./paginas/Admin'));
const Privacidad = lazy(() => import('./paginas/Privacidad'));
const NoEncontrado = lazy(() => import('./paginas/NoEncontrado'));

const privada = (elemento: React.ReactNode) => <RutaPrivada>{elemento}</RutaPrivada>;

function AlCambiarRuta() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AlCambiarRuta />
      <ProveedorSesion>
        <Layout>
          <Suspense fallback={<Cargando />}>
            <Routes>
              <Route path="/" element={<Inicio />} />
              <Route path="/ingresar" element={<Ingreso />} />
              <Route path="/registro" element={<Registro />} />
              <Route path="/privacidad" element={<Privacidad />} />
              <Route path="/aprende" element={<Aprende />} />
              <Route path="/aprende/:slug" element={<Articulo />} />
              <Route path="/panel" element={privada(<Panel />)} />
              <Route path="/perfil" element={privada(<Perfil />)} />
              <Route path="/instrumentos" element={privada(<Instrumentos />)} />
              <Route path="/instrumentos/:simbolo" element={privada(<DetalleInstrumento />)} />
              <Route path="/portafolios/:id" element={privada(<DetallePortafolio />)} />
              <Route path="/ahorro" element={privada(<Ahorro />)} />
              <Route path="/escenarios" element={privada(<Escenarios />)} />
              <Route
                path="/admin"
                element={
                  <RutaPrivada soloAdmin>
                    <Admin />
                  </RutaPrivada>
                }
              />
              <Route path="*" element={<NoEncontrado />} />
            </Routes>
          </Suspense>
        </Layout>
      </ProveedorSesion>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
