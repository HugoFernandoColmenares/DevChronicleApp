# Authentication

Studio uses Firebase Authentication with the Google provider only. There is no email/password, anonymous auth, or open registration.

Flow:

1. Opening `/admin` without a session lands on `/admin/login`.
2. **Continue with Google** opens `signInWithPopup`. On the emulator that popup is the fake-account picker. Local automation can use **Emulator author** instead (`signInEmulatorAdmin`).
3. The app reads `admins/{uid}`. If the document exists, the list loads. Otherwise `/admin/denied` appears with no self-invite control.
4. Sign-out returns to the journal.

Create `admins/{uid}` in the Firebase console (Firestore → `admins` collection, document id = Auth uid). Locally, `npm run seed:admin` writes one emulator admin (`local-admin` / `admin@devchronicle.test`). That script never targets a cloud project.

In production, enable the Google provider and authorize `localhost` (if you test a real-project build), `devchronicle-hugo.web.app`, and `devchronicle-hugo.firebaseapp.com`.
