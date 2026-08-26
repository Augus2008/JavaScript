export type SnippetCategory = {
  id: string
  name: string
  symbol: string
  sort_order: number
}

export type Snippet = {
  id: string
  category_id: string | null
  title: string
  body: string
  is_template: number
  is_favorite: number
  is_pinned: number
  sort_order: number
  created_at: number
  updated_at: number
}

export type LexiconEntry = {
  id: string
  text: string
  code: string | null
  weight: number
  category: string | null
  note: string | null
  source: "manual" | "import" | "workspace"
  workspace_id: string | null
  external_key: string | null
  created_at: number
  updated_at: number
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
