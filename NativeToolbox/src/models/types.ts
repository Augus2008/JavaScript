export type ClipboardKind = "text" | "url" | "image"
export type DuplicatePolicy = "ignore" | "moveToTop" | "keepCopy"

export type ClipboardItem = {
  id: string
  kind: ClipboardKind
  content: string | null
  asset_path: string | null
  fingerprint: string
  title: string | null
  note: string | null
  is_favorite: number
  is_pinned: number
  created_at: number
  updated_at: number
  last_copied_at: number | null
  expires_at: number | null
  byte_size: number
}

export type AppSettings = {
  captureText: boolean
  captureImages: boolean
  duplicatePolicy: DuplicatePolicy
  maxItems: number
  retentionDays: number
}

export type WorkspaceStatus = "connected" | "unavailable" | "changed" | "readonly"

export type Workspace = {
  id: string
  type: "wanxiang" | "generic"
  name: string
  bookmark_name: string
  display_path: string
  version: string | null
  last_seen_hash: string | null
  last_checked_at: number | null
  status: WorkspaceStatus
}
