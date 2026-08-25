import { Path } from "scripting"
import type { ClipboardItem, Workspace } from "../models/types"

const rootDirectory = Path.join(FileManager.documentsDirectory, "NativeToolbox")
const databasePath = Path.join(rootDirectory, "toolbox.sqlite")
const assetsDirectory = Path.join(rootDirectory, "assets", "clipboard")
const exportsDirectory = Path.join(rootDirectory, "exports")
const backupsDirectory = Path.join(rootDirectory, "backups")
const logsDirectory = Path.join(rootDirectory, "logs")

// SQLite.open 要求父目录已经存在；同步创建发生在模块初始化阶段。
if (!FileManager.existsSync(rootDirectory)) {
  FileManager.createDirectorySync(rootDirectory, true)
}

export const paths = {
  rootDirectory,
  databasePath,
  assetsDirectory,
  exportsDirectory,
  backupsDirectory,
  logsDirectory,
}

export async function ensureAppDirectories() {
  for (const path of [rootDirectory, assetsDirectory, exportsDirectory, backupsDirectory, logsDirectory]) {
    if (!(await FileManager.exists(path))) {
      await FileManager.createDirectory(path, true)
    }
  }
}

const db = SQLite.open(databasePath, {
  foreignKeysEnabled: true,
  journalMode: "wal",
  busyMode: 5,
  maximumReaderCount: 3,
  label: "native-toolbox-main",
})

export async function migrateDatabase() {
  await ensureAppDirectories()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clipboard_items (
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
    );
    CREATE INDEX IF NOT EXISTS idx_clipboard_fingerprint ON clipboard_items(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_clipboard_updated ON clipboard_items(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_clipboard_favorite ON clipboard_items(is_favorite, updated_at DESC);

    CREATE TABLE IF NOT EXISTS snippet_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS snippets (
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
    );

    CREATE TABLE IF NOT EXISTS text_pipelines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      steps_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lexicon_entries (
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
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      bookmark_name TEXT NOT NULL,
      display_path TEXT NOT NULL,
      version TEXT,
      last_seen_hash TEXT,
      last_checked_at INTEGER,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_changes (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      target_file TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      base_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
  `)

  const rows = await db.fetchAll<{ version: number }>("SELECT version FROM schema_meta LIMIT 1")
  if (rows.length === 0) {
    await db.execute("INSERT INTO schema_meta(version) VALUES (?)", [1])
    await seedCategories()
  }
}

async function seedCategories() {
  const rows: Array<[string, string, string, number]> = [
    ["work", "工作", "briefcase.fill", 0],
    ["life", "生活", "house.fill", 1],
    ["address", "地址", "mappin.and.ellipse", 2],
    ["code", "代码", "chevron.left.forwardslash.chevron.right", 3],
  ]
  await db.transaction(rows.map(row => ({
    sql: "INSERT OR IGNORE INTO snippet_categories(id,name,symbol,sort_order) VALUES (?,?,?,?)",
    args: row,
  })))
}

export async function listClipboardItems(query = "", kind: "all" | "text" | "url" | "image" | "favorite" = "all") {
  const filters: string[] = []
  const args: Array<string | number> = []
  if (query.trim()) {
    filters.push("(content LIKE ? OR title LIKE ? OR note LIKE ?)")
    const q = `%${query.trim()}%`
    args.push(q, q, q)
  }
  if (kind === "favorite") filters.push("is_favorite = 1")
  else if (kind !== "all") {
    filters.push("kind = ?")
    args.push(kind)
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""
  return db.fetchAll<ClipboardItem>(`
    SELECT * FROM clipboard_items
    ${where}
    ORDER BY is_pinned DESC, updated_at DESC
    LIMIT 1000
  `, args)
}

export async function findClipboardByFingerprint(fingerprint: string) {
  return db.fetchAll<ClipboardItem>(
    "SELECT * FROM clipboard_items WHERE fingerprint = ? ORDER BY updated_at DESC LIMIT 1",
    [fingerprint]
  ).then(rows => rows[0] ?? null)
}

export async function insertClipboardItem(item: ClipboardItem) {
  await db.execute(`
    INSERT INTO clipboard_items(
      id,kind,content,asset_path,fingerprint,title,note,is_favorite,is_pinned,
      created_at,updated_at,last_copied_at,expires_at,byte_size
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `, [
    item.id, item.kind, item.content, item.asset_path, item.fingerprint,
    item.title, item.note, item.is_favorite, item.is_pinned, item.created_at,
    item.updated_at, item.last_copied_at, item.expires_at, item.byte_size,
  ])
}

export async function touchClipboardItem(id: string, now: number) {
  await db.execute("UPDATE clipboard_items SET updated_at = ? WHERE id = ?", [now, id])
}

export async function toggleClipboardFavorite(id: string) {
  await db.execute(`
    UPDATE clipboard_items
    SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END,
        updated_at = ?
    WHERE id = ?
  `, [Date.now(), id])
}

export async function deleteClipboardItem(id: string) {
  await db.execute("DELETE FROM clipboard_items WHERE id = ?", [id])
}

export async function markClipboardCopied(id: string) {
  await db.execute("UPDATE clipboard_items SET last_copied_at = ? WHERE id = ?", [Date.now(), id])
}

export async function cleanupClipboard(maxItems: number, now: number) {
  await db.execute("DELETE FROM clipboard_items WHERE is_favorite = 0 AND expires_at IS NOT NULL AND expires_at < ?", [now])
  await db.execute(`
    DELETE FROM clipboard_items
    WHERE is_favorite = 0 AND id IN (
      SELECT id FROM clipboard_items
      WHERE is_favorite = 0
      ORDER BY updated_at DESC
      LIMIT -1 OFFSET ?
    )
  `, [maxItems])
}

export async function listWorkspaces() {
  return db.fetchAll<Workspace>("SELECT * FROM workspaces ORDER BY name")
}

export async function upsertWorkspace(workspace: Workspace) {
  await db.execute(`
    INSERT INTO workspaces(
      id,type,name,bookmark_name,display_path,version,last_seen_hash,last_checked_at,status
    ) VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      type=excluded.type,
      name=excluded.name,
      bookmark_name=excluded.bookmark_name,
      display_path=excluded.display_path,
      version=excluded.version,
      last_seen_hash=excluded.last_seen_hash,
      last_checked_at=excluded.last_checked_at,
      status=excluded.status
  `, [
    workspace.id, workspace.type, workspace.name, workspace.bookmark_name,
    workspace.display_path, workspace.version, workspace.last_seen_hash,
    workspace.last_checked_at, workspace.status,
  ])
}

export async function removeWorkspace(id: string) {
  await db.execute("DELETE FROM workspaces WHERE id = ?", [id])
}

export { db }
