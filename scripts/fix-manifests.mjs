/**
 * Fix for Next.js 15.2.x dev server startup crash.
 *
 * The dev server reads server-side manifests before webpack compiles them.
 * We ONLY create the server-side routing manifests (safe as empty stubs).
 *
 * We must NOT create build-manifest.json / fallback-build-manifest.json
 * because those control client-side JS loading — empty stubs cause a blank page.
 */
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const dotNext = join(process.cwd(), '.next');
const serverDir = join(dotNext, 'server');

// Ensure directories exist
for (const dir of [dotNext, serverDir]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ONLY server-side routing manifests — safe as empty stubs
const manifests = [
  {
    path: join(serverDir, 'middleware-manifest.json'),
    data: { sortedMiddleware: [], middleware: {}, functions: {}, version: 3 },
  },
  {
    path: join(serverDir, 'pages-manifest.json'),
    data: {},
  },
  {
    path: join(serverDir, 'app-paths-manifest.json'),
    data: {},
  },
];

let created = 0;
for (const file of manifests) {
  if (!existsSync(file.path)) {
    writeFileSync(file.path, JSON.stringify(file.data, null, 2));
    created++;
  }
}

if (created > 0) {
  console.log(`✅ Created ${created} placeholder manifest(s)`);
}
