// npx tsx scripts/migrate-challenges.ts --emulator --project demo-devchronicle [--apply]
// npx tsx scripts/migrate-challenges.ts --project devchronicle-hugo [--apply]
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

import { CHALLENGES } from '../src/app/features/challenges/challenges.fallback';
import { loadEnv } from './lib/load-env.mjs';

loadEnv();
process.env.METADATA_SERVER_DETECTION = process.env.METADATA_SERVER_DETECTION || 'none';

const args = process.argv.slice(2);
const emulator = args.includes('--emulator');
const apply = args.includes('--apply');
const projectFlag = args.indexOf('--project');
const projectId = projectFlag >= 0 ? args[projectFlag + 1] : undefined;

if (!projectId || projectId.startsWith('-')) {
  throw new Error('Pasa --project <id>.');
}

if (emulator) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  initializeApp({ projectId });
} else {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Quita FIRESTORE_EMULATOR_HOST o usa --emulator.');
  }
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  initializeApp({
    projectId,
    credential: inline
      ? cert(
          JSON.parse(
            inline.trim().startsWith('{') ? inline : Buffer.from(inline, 'base64').toString('utf8'),
          ),
        )
      : applicationDefault(),
  });
}

async function main(): Promise<void> {
  const db = getFirestore();
  // Fecha de publicación de referencia: ahora mismo (cámbiala si quieres otra).
  const now = Timestamp.now();
  let created = 0;
  let skipped = 0;

  for (const [index, challenge] of CHALLENGES.entries()) {
    const ref = db.doc(`challenges/${challenge.slug}`);
    const data = {
      slug: challenge.slug,
      title: challenge.title,
      summary: challenge.summary,
      difficulty: challenge.difficulty,
      tags: challenge.tags,
      language: challenge.language,
      prompt: challenge.prompt,
      hint: challenge.hint,
      solution: challenge.solution,
      articleSlug: challenge.articleSlug ?? null,
      articleTitle: challenge.articleTitle ?? null,
      order: (index + 1) * 10,
      status: 'published',
      publishedAt: now,
      updatedAt: now,
    };

    if (!apply) {
      console.log(`[simulacro] crearía challenges/${challenge.slug} (order ${data.order})`);
      continue;
    }

    try {
      await ref.create(data); // falla si ya existe: no pisa nada
      created += 1;
      console.log(`creado ${challenge.slug}`);
    } catch (error) {
      const code = (error as { code?: number })?.code;
      if (code === 6 /* ALREADY_EXISTS */) {
        skipped += 1;
        console.log(`ya existía ${challenge.slug}, no se toca`);
      } else {
        throw error;
      }
    }
  }

  console.log(
    apply
      ? `Listo: ${created} creados, ${skipped} ya existían.`
      : 'Simulacro terminado. Agrega --apply para escribir.',
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
