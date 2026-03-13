/**
 * Script to:
 * 1. Create Firestore composite indexes via REST API
 * 2. Publish a test blog article
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GoogleAuth } from 'google-auth-library';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local - handle multiline values in quotes
const envContent = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8');
let currentKey = null;
let currentVal = '';
let inMultiline = false;

for (const line of envContent.split('\n')) {
  if (inMultiline) {
    currentVal += '\n' + line;
    if (line.includes('"')) {
      // End of multiline value
      inMultiline = false;
      process.env[currentKey] = currentVal.replace(/^"|"$/g, '');
      currentKey = null;
      currentVal = '';
    }
    continue;
  }
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1 || line.startsWith('#')) continue;
  const key = line.slice(0, eqIdx).trim();
  let val = line.slice(eqIdx + 1).trim();

  if (val.startsWith('"') && !val.endsWith('"')) {
    // Start of multiline
    inMultiline = true;
    currentKey = key;
    currentVal = val;
    continue;
  }
  if (val.startsWith('"') && val.endsWith('"')) {
    val = val.slice(1, -1);
  }
  process.env[key] = val;
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || '';
// Handle escaped newlines from .env
privateKey = privateKey.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase Admin env vars');
  process.exit(1);
}

// Init Firebase Admin
const app = initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});
const db = getFirestore(app);

// ========== 1. CREATE FIRESTORE INDEXES ==========
async function createIndexes() {
  console.log('\n📋 Creating Firestore composite indexes...\n');

  const auth = new GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();

  const indexes = [
    {
      name: 'blogPosts: status + publishedAt',
      body: {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'publishedAt', order: 'DESCENDING' },
        ],
        queryScope: 'COLLECTION',
      },
      collectionId: 'blogPosts',
    },
    {
      name: 'supportTickets: userId + updatedAt',
      body: {
        fields: [
          { fieldPath: 'userId', order: 'ASCENDING' },
          { fieldPath: 'updatedAt', order: 'DESCENDING' },
        ],
        queryScope: 'COLLECTION',
      },
      collectionId: 'supportTickets',
    },
    {
      name: 'bookings: professionalId + date',
      body: {
        fields: [
          { fieldPath: 'professionalId', order: 'ASCENDING' },
          { fieldPath: 'date', order: 'ASCENDING' },
        ],
        queryScope: 'COLLECTION',
      },
      collectionId: 'bookings',
    },
    {
      name: 'bookings: status + date',
      body: {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'date', order: 'ASCENDING' },
        ],
        queryScope: 'COLLECTION',
      },
      collectionId: 'bookings',
    },
  ];

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups`;

  for (const idx of indexes) {
    try {
      const url = `${baseUrl}/${idx.collectionId}/indexes`;
      const res = await client.request({
        url,
        method: 'POST',
        data: idx.body,
      });
      console.log(`  ✅ ${idx.name} → creating (${res.data?.name || 'ok'})`);
    } catch (err) {
      if (err.response?.status === 409 || err.message?.includes('already exists')) {
        console.log(`  ⏭️  ${idx.name} → already exists`);
      } else {
        console.log(`  ❌ ${idx.name} → ${err.response?.data?.error?.message || err.message}`);
      }
    }
  }
}

// ========== 2. PUBLISH BLOG ARTICLE ==========
async function publishBlogArticle() {
  console.log('\n📝 Publishing test blog article...\n');

  // Check if already exists
  const existing = await db.collection('blogPosts').where('slug', '==', 'bienfaits-meditation-quotidienne').get();
  if (!existing.empty) {
    console.log('  ⏭️  Article "bienfaits-meditation-quotidienne" already exists, skipping');
    return;
  }

  const now = Timestamp.now();
  const content = `
<h2>Pourquoi méditer chaque jour ?</h2>
<p>La méditation est une pratique ancestrale qui connaît un regain d'intérêt considérable. De nombreuses études scientifiques ont démontré ses bienfaits sur la santé mentale et physique.</p>

<h3>1. Réduction du stress et de l'anxiété</h3>
<p>La méditation de pleine conscience (mindfulness) permet de réduire significativement les niveaux de cortisol, l'hormone du stress. En pratiquant régulièrement, vous apprenez à observer vos pensées sans vous y attacher, ce qui diminue l'anxiété au quotidien.</p>

<h3>2. Amélioration de la concentration</h3>
<p>Des recherches menées à l'Université de Harvard ont montré que 8 semaines de méditation suffisent pour modifier la structure du cerveau, notamment dans les zones liées à l'attention et à la mémoire.</p>

<h3>3. Meilleure qualité de sommeil</h3>
<p>La méditation guidée avant le coucher aide à calmer le mental et facilite l'endormissement. Les pratiquants réguliers rapportent une amélioration notable de leur qualité de sommeil.</p>

<h3>4. Renforcement du système immunitaire</h3>
<p>Plusieurs études ont établi un lien entre la pratique méditative et le renforcement des défenses immunitaires. Le corps se régénère mieux lorsque l'esprit est apaisé.</p>

<h3>Comment commencer ?</h3>
<p>Pas besoin de méditer une heure par jour pour ressentir les bienfaits. Commencez par 5 à 10 minutes chaque matin :</p>
<ul>
  <li>Asseyez-vous confortablement dans un endroit calme</li>
  <li>Fermez les yeux et concentrez-vous sur votre respiration</li>
  <li>Observez vos pensées sans jugement</li>
  <li>Ramenez doucement votre attention sur le souffle</li>
</ul>

<p>Sur <strong>Theralib</strong>, vous pouvez trouver des praticiens spécialisés en méditation et en sophrologie pour vous accompagner dans votre pratique. N'hésitez pas à consulter notre <a href="/repertoire">répertoire de thérapeutes</a>.</p>
`.trim();

  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const docRef = db.collection('blogPosts').doc();
  await docRef.set({
    title: 'Les bienfaits de la méditation quotidienne',
    slug: 'bienfaits-meditation-quotidienne',
    excerpt: 'Découvrez comment quelques minutes de méditation par jour peuvent transformer votre bien-être mental et physique. Réduction du stress, meilleur sommeil, concentration accrue...',
    content,
    coverImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=630&fit=crop',
    category: 'meditation',
    tags: ['méditation', 'bien-être', 'stress', 'sommeil', 'mindfulness'],
    authorId: 'admin',
    authorName: 'Équipe Theralib',
    status: 'published',
    publishedAt: now,
    seoTitle: 'Les bienfaits de la méditation quotidienne | Theralib',
    seoDescription: 'Découvrez les bienfaits scientifiquement prouvés de la méditation : réduction du stress, meilleur sommeil, concentration. Guide pour débuter.',
    readingTime,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`  ✅ Article publié: "${docRef.id}"`);
  console.log(`     Slug: bienfaits-meditation-quotidienne`);
  console.log(`     Temps de lecture: ${readingTime} min`);
}

// ========== RUN ==========
async function main() {
  try {
    await createIndexes();
    await publishBlogArticle();
    console.log('\n✨ Tout est prêt ! Tu peux tester.\n');
  } catch (err) {
    console.error('\n💥 Erreur:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

main();
