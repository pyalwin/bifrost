import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
        secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--secondary-foreground)' },
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        'diff-added-bg': 'var(--diff-added-bg)',
        'diff-removed-bg': 'var(--diff-removed-bg)',
        'diff-added-text': 'var(--diff-added-text)',
        'diff-removed-text': 'var(--diff-removed-text)',
        'title-bar': 'var(--title-bar-bg)',
        'user-bubble': 'var(--user-bubble)'
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px'
      },
      fontFamily: {
        mono: ['SF Mono', 'Monaco', 'Menlo', 'monospace']
      }
    }
  },
  plugins: []
}
export default config
