/** Política de tratamiento de datos personales (RNF-07, Ley 1581 de 2012). */
export default function Privacidad() {
  return (
    <article className="prose-sm mx-auto max-w-3xl space-y-4 text-slate-800">
      <h1 className="text-2xl font-bold text-slate-900">Política de tratamiento de datos personales</h1>
      <p>
        Esta política aplica a la <strong>Plataforma de Simulación de Inversión</strong>, proyecto académico de la
        asignatura Ingeniería de Software I de la Universidad Industrial de Santander. Se expide en cumplimiento de la
        Ley Estatutaria 1581 de 2012 y sus decretos reglamentarios.
      </p>
      <h2 className="text-lg font-semibold text-slate-900">1. Datos que recolectamos</h2>
      <p>
        Solo recolectamos los datos mínimos para operar tu cuenta: <strong>nombre</strong> y{' '}
        <strong>correo electrónico</strong>. Tu contraseña se almacena cifrada con una función de derivación con sal y
        nunca en texto plano. La plataforma <strong>no solicita ni almacena datos bancarios ni medios de pago</strong>,
        porque no maneja dinero real.
      </p>
      <h2 className="text-lg font-semibold text-slate-900">2. Finalidad</h2>
      <p>
        Usamos tus datos para identificarte, mantener tu sesión y guardar tus portafolios y operaciones simuladas. No
        los usamos con fines comerciales ni los compartimos con terceros.
      </p>
      <h2 className="text-lg font-semibold text-slate-900">3. Autorización</h2>
      <p>
        Al registrarte otorgas tu autorización previa, expresa e informada para este tratamiento. Guardamos la fecha y
        la hora de tu autorización como evidencia.
      </p>
      <h2 className="text-lg font-semibold text-slate-900">4. Tus derechos</h2>
      <p>
        Como titular puedes conocer, actualizar y rectificar tus datos (desde tu perfil), solicitar prueba de la
        autorización, revocarla o pedir la supresión de tus datos, y presentar quejas ante la Superintendencia de
        Industria y Comercio.
      </p>
      <h2 className="text-lg font-semibold text-slate-900">5. Seguridad</h2>
      <p>
        Toda la comunicación usa HTTPS. Las sesiones expiran tras 30 minutos de inactividad y cada usuario solo puede
        acceder a su propia información.
      </p>
      <h2 className="text-lg font-semibold text-slate-900">6. Responsable y contacto</h2>
      <p>
        Responsable: equipo del proyecto (Juan Daniel Torres Ramírez, Camilo Andrés Velandia Mendoza y Santiago Fonseca
        Hernández), Escuela de Ingeniería de Sistemas e Informática, UIS. Para ejercer tus derechos escribe al equipo a
        través del repositorio del proyecto.
      </p>
    </article>
  );
}
