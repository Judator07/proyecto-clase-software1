/** Utilidades criptográficas (RNF-05): contraseñas con PBKDF2-SHA256 y sal, y tokens de sesión. */

const codificador = new TextEncoder();

function aBase64(bytes: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function desdeBase64(texto: string): Uint8Array {
  return Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));
}

export function generarSal(): string {
  return aBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function derivarHash(contrasena: string, salBase64: string, iteraciones: number): Promise<string> {
  const clave = await crypto.subtle.importKey('raw', codificador.encode(contrasena), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: desdeBase64(salBase64), iterations: iteraciones },
    clave,
    256,
  );
  return aBase64(bits);
}

/** Comparación en tiempo constante para no filtrar información por temporización. */
function igualesEnTiempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

export async function verificarContrasena(
  contrasena: string,
  hashEsperado: string,
  salBase64: string,
  iteraciones: number,
): Promise<boolean> {
  return igualesEnTiempoConstante(await derivarHash(contrasena, salBase64, iteraciones), hashEsperado);
}

/** Token de sesión aleatorio de 256 bits (base64url). Solo su hash se guarda en la base de datos. */
export function generarToken(): string {
  return aBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sha256(texto: string): Promise<string> {
  const resumen = await crypto.subtle.digest('SHA-256', codificador.encode(texto));
  return [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
