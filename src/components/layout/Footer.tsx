import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-brand-petrol-dark text-gray-400 py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="text-white font-bold text-xl mb-4">Theralib</div>
            <p className="text-sm leading-relaxed">
              La plateforme de référence pour trouver et réserver des
              professionnels du bien-être.
            </p>
            <p className="text-xs mt-4 text-brand-teal tracking-widest">
              VALORISEZ VOTRE BIEN-ÊTRE
            </p>
          </div>
          <div>
            <div className="text-white font-semibold mb-4">Plateforme</div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/repertoire"
                  className="hover:text-brand-teal transition-colors"
                >
                  Répertoire
                </Link>
              </li>
              <li>
                <Link
                  href="/#comment-ca-marche"
                  className="hover:text-brand-teal transition-colors"
                >
                  Comment ça marche
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="hover:text-brand-teal transition-colors"
                >
                  Inscription Pro
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="hover:text-brand-teal transition-colors"
                >
                  Connexion
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-white font-semibold mb-4">Spécialités</div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/repertoire?cat=massage"
                  className="hover:text-brand-teal transition-colors"
                >
                  Massage
                </Link>
              </li>
              <li>
                <Link
                  href="/repertoire?cat=osteopathie"
                  className="hover:text-brand-teal transition-colors"
                >
                  Ostéopathie
                </Link>
              </li>
              <li>
                <Link
                  href="/repertoire?cat=naturopathie"
                  className="hover:text-brand-teal transition-colors"
                >
                  Naturopathie
                </Link>
              </li>
              <li>
                <Link
                  href="/repertoire?cat=yoga"
                  className="hover:text-brand-teal transition-colors"
                >
                  Yoga
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-white font-semibold mb-4">Légal</div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/mentions-legales"
                  className="hover:text-brand-teal transition-colors"
                >
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link
                  href="/cgv"
                  className="hover:text-brand-teal transition-colors"
                >
                  CGV
                </Link>
              </li>
              <li>
                <Link
                  href="/confidentialite"
                  className="hover:text-brand-teal transition-colors"
                >
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-brand-teal transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-8 text-center text-sm">
          <p>© {new Date().getFullYear()} Theralib – Groupe Acacia EdTech. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
