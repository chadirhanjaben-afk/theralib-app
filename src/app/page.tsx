import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="bg-brand-petrol text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 340 100" className="h-10 w-auto" aria-label="Theralib">
              <g transform="translate(20, 5)">
                <path d="M 0 25 C 27.5 11, 55 11, 82.5 25 C 110 39, 137.5 39, 165 25" fill="none" stroke="rgba(200,220,220,0.45)" strokeWidth="7" strokeLinecap="round"/>
                <path d="M 0 40 C 27.5 25, 55 25, 82.5 40 C 110 55, 137.5 55, 165 40" fill="none" stroke="#5AAFAF" strokeWidth="8" strokeLinecap="round"/>
                <path d="M 0 55 C 27.5 39, 55 39, 82.5 55 C 110 71, 137.5 71, 165 55" fill="none" stroke="rgba(90,175,175,0.5)" strokeWidth="9" strokeLinecap="round"/>
              </g>
              <text x="195" y="52" fontFamily="Quicksand, sans-serif" fontSize="36" fill="#b0cece" fontWeight="500">
                <tspan fill="#b0cece">thera</tspan>
                <tspan fill="#ffffff" fontWeight="700">lib</tspan>
              </text>
            </svg>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/repertoire" className="hover:text-brand-teal transition-colors">
              Répertoire
            </Link>
            <Link href="/login" className="hover:text-brand-teal transition-colors">
              Connexion
            </Link>
            <Link
              href="/register"
              className="btn-primary text-sm py-2 px-5"
            >
              Inscription Pro
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-petrol via-brand-petrol-dark to-brand-wave-mid text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
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

      {/* Features */}
      <section className="py-20 px-6 bg-white">
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
                desc: 'Chaque professionnel est vérifié avec ses certifications et diplômes.',
                icon: '🛡️',
              },
              {
                title: 'Réservation simple',
                desc: 'Réservez en 3 clics avec paiement sécurisé via Stripe.',
                icon: '📅',
              },
              {
                title: 'Programme fidélité',
                desc: 'Gagnez des points à chaque réservation et profitez de réductions.',
                icon: '⭐',
              },
            ].map((feature) => (
              <div key={feature.title} className="card-hover text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-brand-blue-gray">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-petrol-dark text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} Theralib. Tous droits réservés.
          </p>
          <p className="text-xs mt-2 text-brand-teal tracking-widest">
            VALORISEZ VOTRE BIEN-ÊTRE
          </p>
        </div>
      </footer>
    </div>
  );
}