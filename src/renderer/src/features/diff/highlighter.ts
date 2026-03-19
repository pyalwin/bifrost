import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki'

let highlighterPromise: Promise<Highlighter> | null = null

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: ['typescript', 'tsx', 'javascript', 'python', 'json', 'css', 'html', 'yaml', 'bash']
    })
  }
  return highlighterPromise
}

export async function highlightLine(
  code: string,
  lang: string,
  theme: 'github-light' | 'github-dark'
): Promise<string> {
  try {
    const highlighter = await getHighlighter()
    const loadedLangs = highlighter.getLoadedLanguages()
    if (!loadedLangs.includes(lang as any)) {
      return escapeHtml(code)
    }
    const tokens = highlighter.codeToTokens(code, { lang: lang as BundledLanguage, theme })
    return (
      tokens.tokens[0]
        ?.map((token) => `<span style="color:${token.color}">${escapeHtml(token.content)}</span>`)
        .join('') ?? escapeHtml(code)
    )
  } catch {
    // WASM or Shiki init failure — fall back to plain text
    return escapeHtml(code)
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
