export type MigrationStep = {
  sql: string
  args?: Array<string | number | boolean | null>
}

export type Migration = {
  version: number
  name: string
  steps: MigrationStep[]
}

export const initialMigration: Migration = {
  version: 1,
  name: "001-initial",
  steps: [
    { sql: `CREATE TABLE IF NOT EXISTS schema_meta (version INTEGER NOT NULL)` },
    { sql: `CREATE TABLE IF NOT EXISTS clipboard_items (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK(kind IN ('text', 'url', 'image')),
      content TEXT,
      asset_path TEXT,
      fingerprint TEXT NOT NULL,
      title TEXT,
      note TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_copied_at INTEGER,
      expires_at INTEGER,
      byte_size INTEGER NOT NULL DEFAULT 0
    )` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_clipboard_fingerprint ON clipboard_items(fingerprint)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_clipboard_updated ON clipboard_items(updated_at DESC)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_clipboard_favorite ON clipboard_items(is_favorite, updated_at DESC)` },

    { sql: `CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )` },
    { sql: `CREATE TABLE IF NOT EXISTS clipboard_tags (
      item_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY(item_id, tag_id),
      FOREIGN KEY(item_id) REFERENCES clipboard_items(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_clipboard_tags_tag ON clipboard_tags(tag_id)` },

    { sql: `CREATE TABLE IF NOT EXISTS snippet_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )` },
    { sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_snippet_categories_name ON snippet_categories(name)` },
    { sql: `CREATE TABLE IF NOT EXISTS snippets (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_template INTEGER NOT NULL DEFAULT 0,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(category_id) REFERENCES snippet_categories(id) ON DELETE SET NULL
    )` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_snippets_category_order ON snippets(category_id, is_pinned DESC, sort_order)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_snippets_updated ON snippets(updated_at DESC)` },

    { sql: `CREATE TABLE IF NOT EXISTS text_pipelines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      steps_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )` },
    { sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_text_pipelines_name ON text_pipelines(name)` },

    { sql: `CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('wanxiang', 'generic')),
      name TEXT NOT NULL,
      bookmark_name TEXT NOT NULL,
      display_path TEXT NOT NULL,
      version TEXT,
      last_seen_hash TEXT,
      last_checked_at INTEGER,
      status TEXT NOT NULL CHECK(status IN ('connected', 'unavailable', 'changed', 'readonly'))
    )` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_workspaces_bookmark ON workspaces(bookmark_name)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_workspaces_status ON workspaces(status)` },

    { sql: `CREATE TABLE IF NOT EXISTS lexicon_entries (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      code TEXT,
      weight INTEGER NOT NULL DEFAULT 10,
      category TEXT,
      note TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      workspace_id TEXT,
      external_key TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
    )` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_lexicon_text ON lexicon_entries(text)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_lexicon_code ON lexicon_entries(code)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_lexicon_workspace ON lexicon_entries(workspace_id, updated_at DESC)` },

    { sql: `CREATE TABLE IF NOT EXISTS workspace_changes (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      target_file TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('insert', 'update', 'delete', 'create')),
      payload_json TEXT NOT NULL,
      base_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'applied', 'conflict', 'reverted')),
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    )` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_workspace_changes_pending ON workspace_changes(workspace_id, status, created_at)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_workspace_changes_target ON workspace_changes(workspace_id, target_file)` },

    { sql: `INSERT OR IGNORE INTO snippet_categories(id,name,symbol,sort_order) VALUES (?,?,?,?)`, args: ["work", "工作", "briefcase.fill", 0] },
    { sql: `INSERT OR IGNORE INTO snippet_categories(id,name,symbol,sort_order) VALUES (?,?,?,?)`, args: ["life", "生活", "house.fill", 1] },
    { sql: `INSERT OR IGNORE INTO snippet_categories(id,name,symbol,sort_order) VALUES (?,?,?,?)`, args: ["address", "地址", "mappin.and.ellipse", 2] },
    { sql: `INSERT OR IGNORE INTO snippet_categories(id,name,symbol,sort_order) VALUES (?,?,?,?)`, args: ["code", "代码", "chevron.left.forwardslash.chevron.right", 3] },

    { sql: `UPDATE schema_meta SET version = 1` },
    { sql: `INSERT INTO schema_meta(version) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM schema_meta)` },
  ],
}
