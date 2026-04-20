/**
 * Tema oscuro para todos los componentes de Clerk.
 * Replica las variables CSS del globals.css sin necesitar @clerk/themes.
 */
export const clerkDarkAppearance = {
  variables: {
    colorBackground: '#020617',
    colorInputBackground: '#0f172a',
    colorInputText: '#f1f5f9',
    colorText: '#f1f5f9',
    colorTextSecondary: '#94a3b8',
    colorPrimary: '#0ea5e9',
    colorDanger: '#ef4444',
    colorSuccess: '#22c55e',
    borderRadius: '0.75rem',
    fontFamily: 'var(--font-inter), sans-serif',
  },
  elements: {
    card: 'shadow-2xl border border-white/10',
    formButtonPrimary: 'bg-sky-500 hover:bg-sky-400 text-white',
    footerActionLink: 'text-sky-400 hover:text-sky-300',
  },
};
