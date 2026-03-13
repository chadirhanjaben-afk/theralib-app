'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💥</div>
            <h2 style={{ color: '#1B3C4D', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Erreur critique
            </h2>
            <p style={{ color: '#4A6670', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              L&apos;application a rencontré une erreur grave. Veuillez réessayer.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.625rem 1.5rem',
                background: '#5AAFAF',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
