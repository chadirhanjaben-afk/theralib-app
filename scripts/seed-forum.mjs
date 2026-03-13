/**
 * Seed forum with test threads and replies
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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
    inMultiline = true;
    currentKey = key;
    currentVal = val;
    continue;
  }
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  process.env[key] = val;
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || '';
privateKey = privateKey.replace(/\\n/g, '\n');

const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);

async function seed() {
  console.log('\n💬 Seeding forum data...\n');

  // Check if already seeded
  const existing = await db.collection('forumThreads').limit(1).get();
  if (!existing.empty) {
    console.log('  ⏭️  Forum already has data, skipping seed');
    process.exit(0);
  }

  const threads = [
    {
      title: 'Comment bien choisir son premier cours de yoga ?',
      slug: `choisir-premier-cours-yoga-${Date.now().toString(36)}`,
      content: `Bonjour à tous !

Je souhaite commencer le yoga mais je suis un peu perdu avec toutes les options : Hatha, Vinyasa, Yin, Ashtanga... Quel type de yoga conseillez-vous pour un débutant complet ?

J'ai 35 ans, je suis plutôt sédentaire et j'ai quelques tensions dans le dos. Mon objectif principal est la détente et la souplesse.

Merci d'avance pour vos conseils ! 🙏`,
      category: 'yoga',
      authorId: 'seed-client-1',
      authorName: 'Marie Dupont',
      authorRole: 'client',
    },
    {
      title: 'Les huiles essentielles incontournables en naturopathie',
      slug: `huiles-essentielles-naturopathie-${Date.now().toString(36)}a`,
      content: `En tant que naturopathe, je partage souvent avec mes patients les huiles essentielles les plus polyvalentes. Voici mon top 5 :

1. Lavande vraie - apaisante, anti-stress, cicatrisante
2. Tea Tree - antibactérien, antifongique
3. Ravintsara - antiviral, stimulant immunitaire
4. Menthe poivrée - digestive, anti-migraine
5. Eucalyptus radié - décongestionnant respiratoire

N'hésitez pas à partager les vôtres ! Attention cependant : les huiles essentielles sont puissantes et certaines sont déconseillées aux femmes enceintes et aux enfants.`,
      category: 'naturopathie',
      authorId: 'seed-pro-1',
      authorName: 'Dr. Sophie Martin',
      authorRole: 'professional',
      isPinned: true,
    },
    {
      title: 'Témoignage : la sophrologie m\'a aidé à gérer mon anxiété',
      slug: `temoignage-sophrologie-anxiete-${Date.now().toString(36)}b`,
      content: `Je voulais partager mon expérience avec la sophrologie. Après des années d'anxiété chronique et plusieurs tentatives avec différentes approches, c'est la sophrologie qui m'a le plus aidé.

Ça fait maintenant 6 mois que je pratique régulièrement (1 séance par semaine avec ma sophrologue + exercices quotidiens de 10 min). Les résultats sont vraiment significatifs : je dors mieux, je gère mieux les situations stressantes au travail, et j'ai retrouvé une vraie sérénité.

Si vous hésitez, je vous encourage vraiment à essayer ! L'important est de trouver un bon praticien avec qui vous êtes à l'aise.`,
      category: 'sophrologie',
      authorId: 'seed-client-2',
      authorName: 'Thomas Bernard',
      authorRole: 'client',
    },
    {
      title: 'Conseils nutrition pour un meilleur sommeil',
      slug: `nutrition-meilleur-sommeil-${Date.now().toString(36)}c`,
      content: `L'alimentation joue un rôle crucial dans la qualité du sommeil. Voici quelques conseils pratiques :

- Évitez la caféine après 14h (café, thé, chocolat, cola)
- Privilégiez un dîner léger, au moins 2h avant le coucher
- Les aliments riches en tryptophane favorisent le sommeil : banane, amandes, dinde, lait chaud
- Le magnésium aide à la relaxation musculaire : épinards, graines de courge, chocolat noir
- Une tisane de camomille ou de valériane avant le coucher peut aider

Quels sont vos astuces nutrition pour mieux dormir ?`,
      category: 'nutrition',
      authorId: 'seed-pro-2',
      authorName: 'Claire Nutrition',
      authorRole: 'professional',
    },
    {
      title: 'Comment fidéliser sa clientèle en tant que praticien bien-être ?',
      slug: `fideliser-clientele-praticien-${Date.now().toString(36)}d`,
      content: `Question pour les praticiens : quelles sont vos stratégies pour fidéliser vos clients ?

Je me suis installée en tant que masseuse il y a 6 mois et j'ai du mal à faire revenir les clients. Ils sont satisfaits de la séance mais ne reviennent pas forcément.

Avez-vous des conseils ? Programme de fidélité, rappels, offres spéciales... Je suis preneuse de toute idée !`,
      category: 'pratique-pro',
      authorId: 'seed-pro-3',
      authorName: 'Léa Massage',
      authorRole: 'professional',
    },
  ];

  const replies = {
    0: [ // Replies for yoga thread
      {
        content: `Pour un débutant avec des tensions dans le dos, je recommande le Hatha Yoga. C'est la forme la plus douce et la plus accessible. Les postures sont tenues plus longtemps, ce qui permet de bien comprendre les alignements.

Le Yin Yoga est aussi excellent pour la souplesse, mais c'est une pratique très passive — ça peut plaire ou pas.

Évitez l'Ashtanga et le Vinyasa au début, c'est trop dynamique pour quelqu'un de sédentaire.`,
        authorId: 'seed-pro-4',
        authorName: 'Yoga Sophie',
        authorRole: 'professional',
      },
      {
        content: 'Merci Sophie ! Je vais essayer le Hatha alors. Tu aurais un praticien à recommander sur Paris ?',
        authorId: 'seed-client-1',
        authorName: 'Marie Dupont',
        authorRole: 'client',
      },
      {
        content: 'Je plussoie le Hatha ! J\'ai commencé par ça il y a 2 ans et maintenant je fais du Vinyasa. Mais le Hatha reste ma base. Courage Marie ! 💪',
        authorId: 'seed-client-3',
        authorName: 'Julie Martin',
        authorRole: 'client',
      },
    ],
    1: [ // Replies for naturopathie thread
      {
        content: 'J\'ajouterais l\'huile essentielle de citron, excellente pour la digestion et purifiante ! Et l\'hélichryse italienne pour les bleus et la circulation.',
        authorId: 'seed-pro-5',
        authorName: 'Nathalie Naturo',
        authorRole: 'professional',
      },
    ],
    4: [ // Replies for fidélisation thread
      {
        content: `Super question ! Voici ce qui marche bien pour moi :

1. J'envoie un SMS de suivi 48h après la séance pour prendre des nouvelles
2. Je propose un forfait 5 séances avec une réduction
3. J'utilise les rappels automatiques de Theralib pour les relances
4. Je publie régulièrement du contenu sur les réseaux sociaux

La clé c'est vraiment le suivi post-séance. Les clients se sentent considérés et reviennent naturellement.`,
        authorId: 'seed-pro-1',
        authorName: 'Dr. Sophie Martin',
        authorRole: 'professional',
      },
      {
        content: 'Le programme de fidélité Theralib aide beaucoup aussi ! Mes clients accumulent des points et ça les motive à revenir.',
        authorId: 'seed-pro-4',
        authorName: 'Yoga Sophie',
        authorRole: 'professional',
      },
    ],
  };

  for (let i = 0; i < threads.length; i++) {
    const t = threads[i];
    const now = Timestamp.fromDate(new Date(Date.now() - (threads.length - i) * 3600000));
    const threadReplies = replies[i] || [];
    const lastReply = threadReplies.length > 0 ? threadReplies[threadReplies.length - 1] : null;

    const threadRef = db.collection('forumThreads').doc();
    await threadRef.set({
      ...t,
      isPinned: t.isPinned || false,
      isLocked: false,
      replyCount: threadReplies.length,
      viewCount: Math.floor(Math.random() * 100) + 5,
      lastReplyAt: lastReply
        ? Timestamp.fromDate(new Date(now.toDate().getTime() + threadReplies.length * 1800000))
        : now,
      lastReplyByName: lastReply ? lastReply.authorName : t.authorName,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`  ✅ Thread: "${t.title}" (${threadReplies.length} replies)`);

    // Create replies
    for (let j = 0; j < threadReplies.length; j++) {
      const r = threadReplies[j];
      const replyTime = Timestamp.fromDate(new Date(now.toDate().getTime() + (j + 1) * 1800000));
      const replyRef = db.collection('forumReplies').doc();
      await replyRef.set({
        threadId: threadRef.id,
        content: r.content,
        authorId: r.authorId,
        authorName: r.authorName,
        authorRole: r.authorRole,
        likes: [],
        createdAt: replyTime,
        updatedAt: replyTime,
      });
    }
  }

  console.log('\n✨ Forum seeded successfully!\n');
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error('💥 Error:', err.message);
  process.exit(1);
});
