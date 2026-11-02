# Autenticación

Studio usa Firebase Authentication con el proveedor de Google. No hay correo y contraseña, ni proveedores anónimos, ni registro abierto.

El flujo:

1. La persona abre `/admin` y, si no hay sesión, llega a `/admin/login`.
2. «Continue with Google» abre `signInWithPopup`. En el emulador, ese popup es el selector de cuentas falsas del Auth emulator.
3. La app lee `admins/{uid}`. Si el documento existe, entra al listado. Si no existe, muestra `/admin/denied` y no ofrece un botón para autoinvitarse.
4. Cerrar sesión vuelve al diario.

Los documentos `admins/{uid}` se crean en la consola de Firebase (Firestore → iniciar colección `admins`, id = uid de Authentication). En local, `npm run seed:admin` escribe uno solo en el emulador, con uid `local-admin` y correo `admin@devchronicle.test`. Ese script no corre contra un proyecto en la nube.

En producción hay que activar el proveedor Google y agregar a los dominios autorizados `localhost` (si se prueba el build contra el proyecto real), `devchronicle-hugo.web.app` y `devchronicle-hugo.firebaseapp.com`.
