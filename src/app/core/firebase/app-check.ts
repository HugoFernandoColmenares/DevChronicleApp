import { FirebaseApp } from 'firebase/app';
import { AppCheck, initializeAppCheck, ReCaptchaV3Provider, getToken } from 'firebase/app-check';

import { environment } from '@env';

let appCheck: AppCheck | null = null;

/**
 * Initializes App Check when a reCAPTCHA v3 site key is configured and emulators are off.
 * Missing keys are a no-op so local/CI builds stay green without secrets.
 */
export function initAppCheck(app: FirebaseApp): AppCheck | null {
  if (appCheck) {
    return appCheck;
  }

  const siteKey = environment.appCheckSiteKey?.trim();
  if (!siteKey || environment.useEmulators) {
    return null;
  }

  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  return appCheck;
}

export async function warmAppCheckToken(): Promise<void> {
  if (!appCheck) {
    return;
  }
  try {
    await getToken(appCheck, false);
  } catch {
    // Enforcement is configured in the Firebase console; a missing token must not block boot.
  }
}
