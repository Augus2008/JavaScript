import { Path } from "scripting"
import type { Migration } from "./001-initial"
import { initialMigration } from "./001-initial"

type AppliedMigration = {
  version: number
  name: string
  checksum: string
  applied_at: number
}

export type MigrationReport = {
  fromVersion: number
  toVersion: number
  applied: string[]
  backupDirectory: string | null
}

const migrations: Migration[] = [initialMigration]

async function tableExists(db: Database, tableName: string) {
  const rows = await db.fetchAll<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    [tableName],
  )
  return rows.length > 0
}

async function columnNames(db: Database, tableName: string) {
  const rows = await db.fetchAll<{ name: string }>(`PRAGMA table_info("${tableName}")`)
  return rows.map(row => row.name)
}

function checksumFor(migration: Migration) {
  const data = Data.fromRawString(JSON.stringify({
    version: migration.version,
    name: migration.name,
    steps: migration.steps,
  }))
  if (data == null) throw new Error(`无法计算数据库迁移 ${migration.version} 的校验值`)
  return Crypto.sha256(data).toHexString()
}

async function ensureMigrationTable(db: Database) {
  await db.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT NOT NULL,
    applied_at INTEGER NOT NULL
  )`)
}

async function readAppliedMigrations(db: Database) {
  const rows = await db.fetchAll<AppliedMigration>(
    "SELECT version,name,checksum,applied_at FROM schema_migrations ORDER BY version"
  )
  return new Map(rows.map(row => [row.version, row]))
}

function timestampName() {
  const d = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function backupDatabaseFiles(databasePath: string, backupsDirectory: string) {
  if (!FileManager.existsSync(databasePath)) return null
  const directory = Path.join(backupsDirectory, `migration-${timestampName()}`)
  FileManager.createDirectorySync(directory, true)
  for (const suffix of ["", "-wal", "-shm"]) {
    const source = `${databasePath}${suffix}`
    if (FileManager.existsSync(source)) {
      FileManager.copyFileSync(source, Path.join(directory, `toolbox.sqlite${suffix}`))
    }
  }
  const marker = Data.fromRawString(JSON.stringify({
    createdAt: Date.now(),
    reason: "before-schema-migration",
  }, null, 2))
  if (marker != null) {
    FileManager.writeAsDataSync(Path.join(directory, "backup.json"), marker)
  }
  return directory
}

export async function runMigrations(
  db: Database,
  databasePath: string,
  backupsDirectory: string,
): Promise<MigrationReport> {
  const hadMigrationTable = await tableExists(db, "schema_migrations")
  const legacyMetaExists = await tableExists(db, "schema_meta")
  let legacyVersion = 0
  if (legacyMetaExists) {
    const rows = await db.fetchAll<{ version: number }>("SELECT version FROM schema_meta LIMIT 1")
    legacyVersion = rows[0]?.version ?? 0
  }

  const backupDirectory = !hadMigrationTable && legacyMetaExists
    ? (await db.execute("PRAGMA wal_checkpoint(FULL)"), backupDatabaseFiles(databasePath, backupsDirectory))
    : null

  await ensureMigrationTable(db)
  const applied = await readAppliedMigrations(db)
  const appliedNames: string[] = []

  for (const migration of migrations) {
    const checksum = checksumFor(migration)
    const existing = applied.get(migration.version)
    if (existing != null) {
      if (existing.name !== migration.name || existing.checksum !== checksum) {
        throw new Error(`数据库迁移 ${migration.version} 校验失败，请从备份恢复或升级脚本`)
      }
      continue
    }

    await db.transaction([
      ...migration.steps,
      {
        sql: "INSERT INTO schema_migrations(version,name,checksum,applied_at) VALUES (?,?,?,?)",
        args: [migration.version, migration.name, checksum, Date.now()],
      },
    ], { kind: "immediate" })
    appliedNames.push(migration.name)
  }

  const latest = migrations[migrations.length - 1]?.version ?? 0
  return {
    fromVersion: legacyVersion,
    toVersion: latest,
    applied: appliedNames,
    backupDirectory,
  }
}

const requiredTables = [
  "schema_migrations",
  "clipboard_items",
  "tags",
  "clipboard_tags",
  "snippet_categories",
  "snippets",
  "text_pipelines",
  "workspaces",
  "lexicon_entries",
  "workspace_changes",
]

const requiredColumns: Record<string, string[]> = {
  clipboard_items: ["id", "kind", "content", "fingerprint", "is_favorite", "updated_at"],
  snippets: ["id", "category_id", "title", "body", "updated_at"],
  workspaces: ["id", "type", "bookmark_name", "status"],
  lexicon_entries: ["id", "text", "code", "weight", "workspace_id"],
  workspace_changes: ["id", "workspace_id", "target_file", "base_hash", "status"],
}

export async function validateSchema(db: Database) {
  const errors: string[] = []
  for (const table of requiredTables) {
    if (!(await tableExists(db, table))) errors.push(`缺少数据表：${table}`)
  }
  for (const [table, expected] of Object.entries(requiredColumns)) {
    if (!(await tableExists(db, table))) continue
    const names = new Set(await columnNames(db, table))
    for (const name of expected) {
      if (!names.has(name)) errors.push(`数据表 ${table} 缺少字段 ${name}`)
    }
  }
  if (errors.length > 0) throw new Error(errors.join("；"))
  return true
}

export { migrations }
