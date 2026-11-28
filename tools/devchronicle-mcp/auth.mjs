const KEY = must('DEVCHRONICLE_WEB_API_KEY');
const EMAIL = must('DEVCHRONICLE_EMAIL');
const PASSWORD = must('DEVCHRONICLE_PASSWORD');
const AUTH_HOST = process.env.DEVCHRONICLE_AUTH_EMULATOR
  ? `http://${process.env.DEVCHRONICLE_AUTH_EMULATOR}/identitytoolkit.googleapis.com`
  : 'https://identitytoolkit.googleapis.com';
const TOKEN_HOST = process.env.DEVCHRONICLE_AUTH_EMULATOR
  ? `http://${process.env.DEVCHRONICLE_AUTH_EMULATOR}/securetoken.googleapis.com`
  : 'https://securetoken.googleapis.com';

let session = null; // { idToken, refreshToken, expiresAt }

export async function idToken() {
  if (session && Date.now() < session.expiresAt - 60_000) {
    return session.idToken;
  }

  if (session?.refreshToken) {
    const response = await fetch(`${TOKEN_HOST}/v1/token?key=${KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
      }),
    });
    if (response.ok) {
      const payload = await response.json();
      session = {
        idToken: payload.id_token,
        refreshToken: payload.refresh_token,
        expiresAt: Date.now() + Number(payload.expires_in) * 1000,
      };
      return session.idToken;
    }
  }

  const response = await fetch(`${AUTH_HOST}/v1/accounts:signInWithPassword?key=${KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  });
  if (!response.ok) {
    throw new Error('No se pudo iniciar sesión como publicador (revisa las variables de entorno).');
  }
  const payload = await response.json();
  session = {
    idToken: payload.idToken,
    refreshToken: payload.refreshToken,
    expiresAt: Date.now() + Number(payload.expiresIn) * 1000,
  };
  return session.idToken;
}

function must(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Falta la variable ${name}`);
    process.exit(1);
  }
  return value;
}
