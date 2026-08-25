import type { AppSettings, ClipboardItem, ClipboardKind } from "../models/types"
import {
  cleanupClipboard,
  findClipboardByFingerprint,
  insertClipboardItem,
  touchClipboardItem,
} from "./database"

export const DEFAULT_SETTINGS: AppSettings = {
  captureText: true,
  captureImages: false,
  duplicatePolicy: "moveToTop",
  maxItems: 500,
  retentionDays: 30,
}

const SETTINGS_KEY = "native-toolbox.settings.v1"
const CHANGE_COUNT_KEY = "native-toolbox.pasteboard.changeCount"

export function loadSettings(): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...(Storage.get<Partial<AppSettings>>(SETTINGS_KEY) ?? {}),
  }
}

export function saveSettings(settings: AppSettings) {
  return Storage.set(SETTINGS_KEY, settings)
}

function normalizeText(text: string) {
  return text.replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trimEnd()
}

function asData(value: string) {
  const data = Data.fromRawString(value)
  if (data == null) throw new Error("无法将文本编码为 UTF-8")
  return data
}

function fingerprint(kind: ClipboardKind, content: string) {
  return Crypto.sha256(asData(`${kind}\u0000${content}`)).toHexString()
}

function looksLikeURL(text: string) {
  return /^https?:\/\/\S+$/i.test(text.trim())
}

async function captureTextValue(raw: string, settings: AppSettings) {
  const content = normalizeText(raw)
  if (!content) return false
  const kind: ClipboardKind = looksLikeURL(content) ? "url" : "text"
  const hash = fingerprint(kind, content)
  const existing = await findClipboardByFingerprint(hash)
  const now = Date.now()

  if (existing && settings.duplicatePolicy === "ignore") return false
  if (existing && settings.duplicatePolicy === "moveToTop") {
    await touchClipboardItem(existing.id, now)
    return true
  }

  const item: ClipboardItem = {
    id: UUID.string(),
    kind,
    content,
    asset_path: null,
    fingerprint: hash,
    title: null,
    note: null,
    is_favorite: 0,
    is_pinned: 0,
    created_at: now,
    updated_at: now,
    last_copied_at: null,
    expires_at: settings.retentionDays > 0
      ? now + settings.retentionDays * 24 * 60 * 60 * 1000
      : null,
    byte_size: asData(content).size,
  }
  await insertClipboardItem(item)
  await cleanupClipboard(settings.maxItems, now)
  return true
}

export async function captureCurrentPasteboard(settings = loadSettings()) {
  let changed = false
  if (settings.captureText) {
    const values = await Pasteboard.getStrings()
    for (const value of values ?? []) {
      changed = (await captureTextValue(value, settings)) || changed
    }
  }

  // 图片写盘在第二个开发切片实现；开关保留但不会把图片误存进 Storage。
  const count = await Pasteboard.changeCount
  Storage.set(CHANGE_COUNT_KEY, count)
  return changed
}

export async function captureIfChanged(settings = loadSettings()) {
  const current = await Pasteboard.changeCount
  const previous = Storage.get<number>(CHANGE_COUNT_KEY)
  if (previous === current) return false
  return captureCurrentPasteboard(settings)
}

export function installPasteboardListener(onCaptured: () => void) {
  Pasteboard.onChanged = () => {
    captureCurrentPasteboard()
      .then((changed: boolean) => changed && onCaptured())
      .catch((error: unknown) => console.error("Pasteboard capture failed", error))
  }
  return () => {
    Pasteboard.onChanged = null
  }
}
