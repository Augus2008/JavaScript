export const KNOWN_TEMPLATE_KEYS = ["date", "time", "datetime", "clipboard"] as const

export type TemplateKey = (typeof KNOWN_TEMPLATE_KEYS)[number]

export type TemplateContext = {
  now?: Date
  clipboard?: string | null
}

export type TemplateRenderResult = {
  text: string
  missing: string[]
}

const TOKEN = /\{\{\s*([^{}]+?)\s*\}\}/g

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function formatDate(now: Date) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function formatTime(now: Date) {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function formatDateTime(now: Date) {
  return `${formatDate(now)} ${formatTime(now)}`
}

export function extractTemplateKeys(body: string) {
  const keys = new Set<string>()
  for (const match of body.matchAll(TOKEN)) {
    const key = match[1].trim()
    if (key) keys.add(key)
  }
  return [...keys]
}

export function looksLikeTemplate(body: string) {
  return extractTemplateKeys(body).length > 0
}

export function renderSnippetTemplate(body: string, context: TemplateContext = {}): TemplateRenderResult {
  const now = context.now ?? new Date()
  const missing: string[] = []
  const values: Record<string, string | undefined> = {
    date: formatDate(now),
    time: formatTime(now),
    datetime: formatDateTime(now),
    clipboard: context.clipboard?.trim() ? context.clipboard.trim() : undefined,
  }

  const text = body.replace(TOKEN, (_all, rawKey: string) => {
    const key = rawKey.trim()
    const value = values[key]
    if (value != null && value !== "") return value
    if (!missing.includes(key)) missing.push(key)
    return `{{${key}}}`
  })

  return { text, missing }
}

export async function currentClipboardText() {
  const values = await Pasteboard.getStrings()
  const first = (values ?? []).find(value => value.trim().length > 0)
  return first ?? ""
}
