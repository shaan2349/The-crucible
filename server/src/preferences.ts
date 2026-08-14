// Language/Depth are user preferences (Settings) sent on relevant
// requests and folded into the system prompt as an explicit override —
// not just a label, since a setting that doesn't actually change output
// would be a UI lie. Both are optional/best-effort: absent or unknown
// values fall through to normal behavior rather than erroring.

function languageInstruction(language: unknown): string {
  if (language === 'simple') {
    return "Use plain, everyday language — avoid philosophical jargon, and if a technical term is unavoidable, explain it briefly in the same sentence."
  }
  if (language === 'scholarly') {
    return 'Use precise philosophical terminology where it genuinely applies, as you would for a reader already familiar with the field.'
  }
  return ''
}

function depthInstruction(depth: unknown): string {
  if (depth === 'quick') {
    return 'Override any length guidance above: keep this noticeably shorter than usual — the essential point only, roughly half the usual length.'
  }
  if (depth === 'deep') {
    return 'Override any length guidance above: this can run longer than usual — more nuance and more careful reasoning are welcome.'
  }
  return ''
}

/** Appended to a system prompt — empty string when both preferences are
 * at their defaults, so default behavior is byte-identical to before
 * this existed. */
export function styleBlock(language: unknown, depth: unknown): string {
  const parts = [languageInstruction(language), depthInstruction(depth)].filter(Boolean)
  return parts.length ? `\n\n${parts.join(' ')}` : ''
}
