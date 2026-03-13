import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

const categories = [
  { name: 'Massage', icon: '💆', count: 120 },
  { name: 'Ostéopathie', icon: '🦴', count: 85 },
  { name: 'Naturopathie', icon: '🌿', count: 64 },
  { name: 'Yoga', icon: '🧘', count: 92 },
  { name: 'Sophrologie', icon: '🧠', count: 47 },
  { name: 'Réflexologie', icon: '🦶', count: 38 },
  { name: 'Acupuncture', icon: '📍', count: 55 },
  { name: 'Hypnothérapie', icon: '🌀', count: 41 },
];

const steps = [
  {
    num: '01',
    title: 'Recherchez',
    desc: 'Explorez notre répertoire de professionnels du bien-être par spécialité, localisation ou disponibilité.',
  },
  {
    num: '02',
    title: 'Comparez',
    desc: 'Consultez les profils détaillés, certifications, avis clients et tarifs pour faire votre choix.',
  },
  {
    num: '03',
    title: 'Réservez',
    desc: 'Choisissez un créneau et payez en ligne de façon sécurisée. Confirmation instantanée.',
  },
];

const testimonials = [
  {
    name: 'Marie L.',
    role: 'Cliente',
    text: "J'ai trouvé une ostéopathe formidable en 2 minutes. La réservation est ultra simple et le programme fidélité est un vrai plus !",
    rating: 5,
  },
  {
    name: 'Thomas D.',
    role: 'Masseur-kinésithérapeute',
    text: "Theralib m'a permis de remplir mon agenda sans effort. L'interface pro est intuitive et le paiement arrive directement sur mon compte.",
    rating: 5,
  },
  {
    name: 'Sophie M.',
    role: 'Cliente',
    text: "Fini les recherches interminables. Tous les thérapeutes sont vérifiés et les avis sont fiables. Je recommande à 100%.",
    rating: 5,
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 text-brand-warm">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <Navbar />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-petrol via-brand-petrol-dark to-brand-wave-mid text-white py-24 md:py-32 px-6 overflow-hidden">
        {/* Decorative waves background */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 1440 600" preserveAspectRatio="none">
            <path d="M0 300 C360 200, 720 400, 1080 300 C1260 250, 1350 350, 1440 300" fill="none" stroke="white" strokeWidth="2"/>
            <path d="M0 350 C360 250, 720 450, 1080 350 C1260 300, 1350 400, 1440 350" fill="none" stroke="white" strokeWidth="2"/>
            <path d="M0 400 C360 300, 720 500, 1080 400 C1260 350, 1350 450, 1440 400" fill="none" stroke="white" strokeWidth="3"/>
          </svg>
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-block badge-teal mb-6 text-sm">
            Nouveau : Programme de fidélité disponible
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Trouvez votre{' '}
            <span className="text-brand-teal">thérapeute</span>
            <br />
            en toute confiance
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Réservez des séances avec des professionnels du bien-être
            vérifiés. Massage, ostéopathie, naturopathie, yoga et plus.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/repertoire" className="btn-warm text-lg py-4 px-8">
              Trouver un professionnel
            </Link>
            <Link href="/register" className="btn-secondary border-white text-white hover:bg-white/10 text-lg py-4 px-8">
              Je suis professionnel
            </Link>
          </div>
          <div className="flex justify-center gap-12 mt-16 text-center">
            <div>
              <div className="text-3xl font-bold text-brand-teal">500+</div>
              <div className="text-sm text-gray-400">Professionnels</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand-teal">15k+</div>
              <div className="text-sm text-gray-400">Réservations</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand-teal">4.8★</div>
              <div className="text-sm text-gray-400">Note moyenne</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-6 bg-brand-teal-bg">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Explorez nos <span className="text-brand-teal">spécialités</span>
          </h2>
          <p className="text-center text-brand-blue-gray mb-12 max-w-2xl mx-auto">
            Trouvez le soin qui vous correspond parmi nos nombreuses catégories de bien-être.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/repertoire?cat=${cat.name.toLowerCase()}`}
                className="card-hover text-center group cursor-pointer"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{cat.icon}</div>
                <h3 className="font-semibold text-brand-petrol">{cat.name}</h3>
                <p className="text-sm text-brand-blue-gray mt-1">{cat.count} praticiens</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="comment-ca-marche" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Comment ça <span className="text-brand-teal">marche</span> ?
          </h2>
          <p className="text-center text-brand-blue-gray mb-16 max-w-2xl mx-auto">
            Trois étapes simples pour prendre soin de vous.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-16 h-16 rounded-full bg-brand-teal/10 text-brand-teal text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-brand-blue-gray leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Pourquoi choisir <span className="text-brand-teal">Theralib</span> ?
          </h2>
          <p className="text-center text-brand-blue-gray mb-16 max-w-2xl mx-auto">
            Une plateforme pensée pour valoriser les professionnels du bien-être
            et simplifier la vie des clients.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Profils vérifiés',
                desc: 'Chaque professionnel est vérifié avec ses certifications et diplômes. Consultez les avis authentiques laissés par de vrais clients.',
                icon: (
                  <svg className="w-8 h-8 text-brand-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
              {
                title: 'Réservation simple',
                desc: 'Réservez en 3 clics avec paiement sécurisé via Stripe. Recevez une confirmation instantanée et des rappels automatiques.',
                icon: (
                  <svg className="w-8 h-8 text-brand-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                title: 'Programme fidélité',
                desc: 'Gagnez des points à chaque réservation et profitez de réductions exclusives. Plus vous prenez soin de vous, plus vous économisez.',
                icon: (
                  <svg className="w-8 h-8 text-brand-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: 'Messagerie intégrée',
                desc: "Échangez directement avec votre thérapeute avant et après la séance. Posez vos questions en toute confidentialité.",
                icon: (
                  <svg className="w-8 h-8 text-brand-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
              },
              {
                title: 'Gestion pro complète',
                desc: "Agenda, facturation, statistiques et visibilité : tout ce dont un professionnel a besoin pour développer son activité.",
                icon: (
                  <svg className="w-8 h-8 text-brand-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
              },
              {
                title: 'Affiliation',
                desc: "Parrainez des professionnels et gagnez une commission sur leurs abonnements. Un revenu passif pour votre réseau.",
                icon: (
                  <svg className="w-8 h-8 text-brand-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
              },
            ].map((feature) => (
              <div key={feature.title} className="card-hover">
                <div className="w-14 h-14 rounded-xl bg-brand-teal/10 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-brand-blue-gray text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Ce que disent nos <span className="text-brand-teal">utilisateurs</span>
          </h2>
          <p className="text-center text-brand-blue-gray mb-16 max-w-2xl mx-auto">
            Découvrez les retours de notre communauté de clients et professionnels.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.name} className="card p-8">
                <StarRating count={t.rating} />
                <p className="text-brand-blue-gray mt-4 mb-6 leading-relaxed italic">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-teal/20 flex items-center justify-center text-brand-teal font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-brand-blue-gray">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Pro */}
      <section className="py-20 px-6 bg-gradient-to-r from-brand-petrol to-brand-wave-mid text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Vous êtes professionnel du bien-être ?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Rejoignez Theralib et développez votre activité. Profil personnalisé,
            gestion d&apos;agenda, paiements sécurisés et visibilité auprès de milliers de clients.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <div className="card bg-white/10 backdrop-blur-sm border-white/20 text-left max-w-xs">
              <div className="text-2xl font-bold text-brand-teal">Starter</div>
              <div className="text-3xl font-bold mt-2">Gratuit</div>
              <ul className="mt-4 space-y-2 text-sm text-gray-300">
                <li>&#10003; Profil de base</li>
                <li>&#10003; 10 réservations/mois</li>
                <li>&#10003; Avis clients</li>
              </ul>
            </div>
            <div className="card bg-white/10 backdrop-blur-sm border-brand-teal text-left max-w-xs ring-2 ring-brand-teal">
              <div className="badge-teal mb-2">Populaire</div>
              <div className="text-2xl font-bold text-brand-teal">Pro</div>
              <div className="text-3xl font-bold mt-2">29€<span className="text-sm font-normal text-gray-300">/mois</span></div>
              <ul className="mt-4 space-y-2 text-sm text-gray-300">
                <li>&#10003; Réservations illimitées</li>
                <li>&#10003; Messagerie client</li>
                <li>&#10003; Statistiques avancées</li>
              </ul>
            </div>
            <div className="card bg-white/10 backdrop-blur-sm border-white/20 text-left max-w-xs">
              <div className="text-2xl font-bold text-brand-warm">Enterprise</div>
              <div className="text-3xl font-bold mt-2">59€<span className="text-sm font-normal text-gray-300">/mois</span></div>
              <ul className="mt-4 space-y-2 text-sm text-gray-300">
                <li>&#10003; Tout Pro +</li>
                <li>&#10003; Multi-praticiens</li>
                <li>&#10003; API & intégrations</li>
              </ul>
            </div>
          </div>
          <Link href="/register" className="btn-warm text-lg py-4 px-10 mt-10 inline-block">
            Créer mon profil professionnel
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-petrol-dark text-gray-400 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="text-white font-bold text-xl mb-4">Theralib</div>
              <p className="text-sm leading-relaxed">
                La plateforme de référence pour trouver et réserver des professionnels du bien-être.
              </p>
              <p className="text-xs mt-4 text-brand-teal tracking-widest">
                VALORISEZ VOTRE BIEN-ÊTRE
              </p>
            </div>
            <div>
              <div className="text-white font-semibold mb-4">Plateforme</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/repertoire" className="hover:text-brand-teal transition-colors">Répertoire</Link></li>
                <li><Link href="#comment-ca-marche" className="hover:text-brand-teal transition-colors">Comment ça marche</Link></li>
                <li><Link href="/register" className="hover:text-brand-teal transition-colors">Inscription Pro</Link></li>
                <li><Link href="/login" className="hover:text-brand-teal transition-colors">Connexion</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-white font-semibold mb-4">Spécialités</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/repertoire?cat=massage" className="hover:text-brand-teal transition-colors">Massage</Link></li>
                <li><Link href="/repertoire?cat=osteopathie" className="hover:text-brand-teal transition-colors">Ostéopathie</Link></li>
                <li><Link href="/repertoire?cat=naturopathie" className="hover:text-brand-teal transition-colors">Naturopathie</Link></li>
                <li><Link href="/repertoire?cat=yoga" className="hover:text-brand-teal transition-colors">Yoga</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-white font-semibold mb-4">Légal</div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/mentions-legales" className="hover:text-brand-teal transition-colors">Mentions légales</Link></li>
                <li><Link href="/cgv" className="hover:text-brand-teal transition-colors">CGV</Link></li>
                <li><Link href="/confidentialite" className="hover:text-brand-teal transition-colors">Confidentialité</Link></li>
                <li><Link href="/contact" className="hover:text-brand-teal transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} Theralib. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
