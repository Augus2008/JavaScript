# 独立 iOS 原生工具箱｜产品与技术规格 v0.1

> 状态：UI 方向已确认，进入可实现规格阶段  
> 运行载体：Scripting App（TSX + 原生 SwiftUI 包装）  
> 产品定位：独立完成剪贴板、常用语、文本处理与词库维护；不依赖元书。万象只是可授权连接的外部词库工作区。

## 1. 产品定义

这是一个面向个人长期使用的原生文本效率工具箱。所有核心数据由工具箱自己维护；即使没有安装元书、没有连接万象目录，剪贴板、常用语和文本工作台也应完整可用。

万象适配器只负责：

- 识别用户授权的万象目录；
- 读取和维护文本格式词库；
- 在写入前生成备份与差异；
- 不接管输入法、不嵌入键盘、不依赖元书脚本。

### 1.1 设计原则

1. **原生优先**：NavigationStack、TabView、List、Form、Sheet、Toolbar、Context Menu、Swipe Actions。
2. **内容优先**：首页展示内容，不把设置项伪装成功能首页。
3. **本地优先**：默认数据留在本机；iCloud 是显式开启的可选层。
4. **写入可逆**：任何外部词库写入都必须可预览、可备份、可回滚。
5. **格式无关**：工具箱内部使用通用词条模型，万象只是一个导入/导出适配器。
6. **诚实遵守 iOS 限制**：不承诺 App 被系统挂起后仍能持续监听剪贴板。

## 2. 信息架构

底部五个主 Tab：

1. 剪贴板
2. 常用语
3. 文本
4. 词库
5. 设置

每个 Tab 有独立 NavigationStack，保留各自的导航状态。iPhone 使用五项系统 Tab Bar；iPad 后续可自动适配侧边栏，但不作为 MVP 阻断项。

## 3. MVP 功能边界

### 3.1 剪贴板

#### 支持类型

- 纯文本 `public.plain-text`
- URL `public.url`
- 图片 `public.jpeg` / `public.png`
- 多项目剪贴板

#### 采集方式

- 脚本前台运行时，通过 `Pasteboard.onChanged` 监听；
- 应用首次打开、恢复前台时，通过 `Pasteboard.changeCount` 检查并补采；
- 支持手动“立即采集”；
- 分享面板接入放到 v1.1，不阻塞 MVP。

#### 主要能力

- 全部 / 文本 / 图片 / 收藏筛选；
- 搜索文本、URL、备注、标签；
- 一键复制回系统剪贴板；
- 收藏、取消收藏、置顶、删除；
- 批量删除与清空非收藏；
- 为条目添加标题、备注、标签；
- 文本详情和图片预览；
- 重复内容策略：忽略 / 更新到顶部 / 保留副本；
- 自动清理：按数量和过期天数双重控制。

#### 默认值

- 文本采集：开启；
- 图片采集：关闭；
- 重复策略：更新到顶部；
- 最大条目：500；
- 过期时间：30 天；
- 收藏内容：永不过期；
- 敏感复制：支持 `localOnly` 与自定义过期时间，但由用户主动选择。

#### 去重规则

- 文本：规范化换行与末尾空白后计算 SHA-256；
- URL：规范化 scheme/host 大小写和尾部空白后计算；
- 图片：以原始 Data 的 SHA-256 为主；
- 不擅自改写正文，只用规范化副本计算指纹。

### 3.2 常用语

#### 主要能力

- 分类、标签、搜索；
- 普通文本和变量模板；
- 收藏、置顶、排序；
- 一键复制；
- 从剪贴板条目创建常用语；
- 编辑前预览变量解析结果；
- JSON / CSV 导入导出。

#### MVP 模板变量

- `{{name}}` 等用户自定义变量；
- `{{date}}`、`{{time}}`、`{{datetime}}`；
- `{{clipboard}}` 当前剪贴板文本；
- `{{counter}}` 手动输入序号；
- 未填写变量时不得静默删除，必须提示。

#### 默认分类

- 工作
- 生活
- 地址
- 代码

分类允许重命名、排序、新增与删除；删除分类不删除条目，条目移动到“未分类”。

### 3.3 文本工作台

#### 页面结构

- 输入 / 结果分段切换；
- 大型文本编辑区；
- 快捷动作横向工具条；
- 还原、复制结果、更多；
- 处理历史仅保留当前会话，保存为常用管线后才持久化。

#### MVP 文本工具

基础清理：

- 去除首尾空白；
- 合并连续空格；
- 合并连续空行；
- 清除不可见字符；
- 统一换行符；
- 中英文空格规范。

行处理：

- 行去重（保序）；
- 行排序；
- 删除空行；
- 添加/移除序号；
- 反转行顺序。

格式处理：

- JSON 格式化与压缩；
- URL 编码与解码；
- Base64 编码与解码；
- 大小写转换；
- 时间戳与日期互转；
- 正则查找替换。

统计：

- 字符数、字数、行数、非空行数；
- 复制结果前显示处理摘要。

#### 管线

用户可把多个纯文本操作保存为命名管线，例如：

`清理空白 → 行去重 → 删除空行`

MVP 只允许确定性、无交互参数的操作进入一键管线；正则等需要参数的操作保存其参数快照。

### 3.4 词库中心

#### 独立内部词库

即使未连接任何外部目录，也可：

- 新增、编辑、删除词条；
- 搜索、分类、标签；
- 批量导入 CSV / JSON / TXT；
- 导出通用 JSON / CSV；
- 维护词语、编码、权重、备注。

#### 外部工作区模型

MVP 首个适配器：万象拼音。

连接流程：

1. 用户点击“添加工作区”；
2. 调用 `DocumentPicker.pickDirectoryBookmark()`；
3. 用户选择万象根目录；
4. 保存返回的 `bookmarkName`；
5. 后续启动通过 `FileManager.bookmarkedPath(bookmarkName)` 恢复访问；
6. 检查特征文件并显示识别结果。

识别条件：

- 必须存在 `wanxiang.schema.yaml`；
- 可选读取 `version.txt`；
- 可选识别 `custom_phrase.txt`、`*.dict.yaml`；
- 缺少关键文件时只能作为“通用目录”连接，不宣称是万象。

#### 万象 MVP 支持

- 双向读取/维护 `custom_phrase.txt`；
- 创建或维护工具箱专属固定词典 `toolbox_words.dict.yaml`；
- 生成启用该固定词典所需的补丁草稿；
- 显示版本、文件哈希、最近修改时间；
- 生成待提交变更队列；
- 差异预览、备份、提交、回滚。

#### 明确不做

- 不直接编辑 `*.userdb`；
- 不解析或修改 `.gram`；
- 不覆盖官方 `dicts/`；
- 不自动替用户“重新部署 Rime”；
- 不未经确认改写已有根目录 `wanxiang.custom.yaml`；
- 不把 `custom/` 模板目录误认为实际生效补丁目录。

### 3.5 设置

分组：

- 数据：数据库状态、占用空间、备份；
- 剪贴板采集：类型、去重、上限、过期；
- iCloud：可选同步开关与状态；
- 词库工作区：目录、连接状态、断开与重新授权；
- 导入导出：完整备份、恢复、CSV/JSON；
- 隐私与权限：剪贴板、文件系统、图片；
- 关于：版本、数据结构版本、诊断导出。

## 4. 数据模型

### 4.1 SQLite 表

#### `clipboard_items`

- `id TEXT PRIMARY KEY`：UUID
- `kind TEXT`：text / url / image
- `content TEXT NULL`
- `asset_path TEXT NULL`
- `fingerprint TEXT INDEXED`
- `title TEXT NULL`
- `note TEXT NULL`
- `is_favorite INTEGER`
- `is_pinned INTEGER`
- `created_at INTEGER`
- `updated_at INTEGER`
- `last_copied_at INTEGER NULL`
- `expires_at INTEGER NULL`
- `byte_size INTEGER`

#### `tags`

- `id TEXT PRIMARY KEY`
- `name TEXT UNIQUE`
- `color TEXT NULL`
- `sort_order INTEGER`

#### `clipboard_tags`

- `item_id TEXT`
- `tag_id TEXT`
- 联合唯一键

#### `snippet_categories`

- `id TEXT PRIMARY KEY`
- `name TEXT`
- `symbol TEXT`
- `sort_order INTEGER`

#### `snippets`

- `id TEXT PRIMARY KEY`
- `category_id TEXT NULL`
- `title TEXT`
- `body TEXT`
- `is_template INTEGER`
- `is_favorite INTEGER`
- `is_pinned INTEGER`
- `sort_order INTEGER`
- `created_at INTEGER`
- `updated_at INTEGER`

#### `text_pipelines`

- `id TEXT PRIMARY KEY`
- `name TEXT`
- `steps_json TEXT`
- `created_at INTEGER`
- `updated_at INTEGER`

#### `lexicon_entries`

- `id TEXT PRIMARY KEY`
- `text TEXT`
- `code TEXT NULL`
- `weight INTEGER`
- `category TEXT NULL`
- `note TEXT NULL`
- `source TEXT`：manual / import / workspace
- `workspace_id TEXT NULL`
- `external_key TEXT NULL`
- `created_at INTEGER`
- `updated_at INTEGER`

#### `workspaces`

- `id TEXT PRIMARY KEY`
- `type TEXT`：wanxiang / generic
- `name TEXT`
- `bookmark_name TEXT`
- `display_path TEXT`
- `version TEXT NULL`
- `last_seen_hash TEXT NULL`
- `last_checked_at INTEGER NULL`
- `status TEXT`：connected / unavailable / changed / readonly

#### `workspace_changes`

- `id TEXT PRIMARY KEY`
- `workspace_id TEXT`
- `target_file TEXT`
- `operation TEXT`：insert / update / delete / create
- `payload_json TEXT`
- `base_hash TEXT`
- `created_at INTEGER`
- `status TEXT`：pending / applied / conflict / reverted

### 4.2 文件目录

```text
Documents/
└─ NativeToolbox/
   ├─ toolbox.sqlite
   ├─ assets/
   │  └─ clipboard/
   ├─ exports/
   ├─ backups/
   └─ logs/
```

图片不放进 SQLite BLOB；数据库只保存相对路径和元数据。

### 4.3 Storage 用途

`Storage` 只保存小型设置：

- 当前 Tab；
- 剪贴板采集开关；
- 去重策略；
- 保留数量与天数；
- UI 偏好；
- 数据结构版本；
- 最后一次 Pasteboard `changeCount`。

大量内容不写入单个 Storage 值。

## 5. 外部词库安全写入协议

每次提交必须执行：

1. 恢复 bookmark 并确认目录可访问；
2. 重新计算目标文件哈希；
3. 与变更创建时的 `base_hash` 比较；
4. 不一致则标记冲突，禁止覆盖；
5. 解析目标文件并验证格式；
6. 生成可读差异预览；
7. 用户确认；
8. 在外部目录内创建 `ToolboxBackups/YYYYMMDD-HHmmss/` 备份；
9. 写入同目录临时文件；
10. 重新解析临时文件；
11. 替换目标文件；
12. 计算新哈希并记录审计日志。

若文件提供方不支持原子重命名，则采用“备份 → 写入 → 校验 → 失败恢复”的保守流程。

### 5.1 `custom_phrase.txt` 规则

- UTF-8；
- 保留原注释和空行；
- 数据行为 `文本<TAB>编码<TAB>权重`；
- 拒绝用空格假冒 Tab；
- 同一文本+编码视为同一逻辑项；
- 不擅自排序整个现有文件；
- 新增内容放入工具箱管理区块，减少与手工内容冲突。

建议区块：

```text
# >>> NativeToolbox managed entries
词条\tcode\t10
# <<< NativeToolbox managed entries
```

### 5.2 固定词典规则

默认只管理：

`toolbox_words.dict.yaml`

不直接改官方 `wanxiang.dict.yaml` 或 `dicts/*.dict.yaml`。

## 6. Scripting 工程结构

```text
NativeToolbox/
├─ index.tsx
├─ intent.tsx                 # v1.1 启用分享/快捷指令
├─ app/
│  ├─ App.tsx
│  ├─ routes.ts
│  └─ theme.ts
├─ features/
│  ├─ clipboard/
│  ├─ snippets/
│  ├─ textlab/
│  ├─ lexicon/
│  └─ settings/
├─ services/
│  ├─ database.ts
│  ├─ pasteboard.ts
│  ├─ asset-store.ts
│  ├─ workspace-bookmarks.ts
│  ├─ backup-writer.ts
│  └─ import-export.ts
├─ adapters/
│  └─ wanxiang/
│     ├─ detector.ts
│     ├─ custom-phrase.ts
│     ├─ fixed-dict.ts
│     └─ patch-draft.ts
├─ models/
│  └─ types.ts
└─ migrations/
   └─ 001-initial.ts
```

### 6.1 生命周期

- `Navigation.present(<App />)` 展示主 UI；
- UI 关闭后必须 `Script.exit()`；
- 注册 `Script.onResume`，回前台时检查剪贴板与工作区状态；
- 页面卸载时清除 `Pasteboard.onChanged`；
- 不依赖永久后台运行；
- 所有长操作显示原生 Progress/禁用状态，避免重复提交。

### 6.2 权限

MVP 需要：

- clipboard：读取和写入系统剪贴板；
- fileSystem：使用文档选择器和外部工作区；

图片采集打开后再触发对应访问，不在首次启动一次性索取无关权限。

## 7. 页面状态

每个主页面必须有：

- 首次空状态；
- 正常内容状态；
- 搜索无结果；
- 加载/处理状态；
- 错误状态；
- 权限不足状态；
- 数据库迁移失败的安全只读状态。

词库额外包含：未连接、已连接、目录失效、只读、外部已变化、存在冲突、待提交、提交成功、可回滚。

## 8. MVP 验收标准

### 剪贴板

- 能采集、筛选、搜索、收藏、删除和复制文本/URL；
- 图片关闭时不落盘，打开时可正常保存和预览；
- 重复策略正确；
- 500 条数据滚动流畅；
- 收藏不会被自动清理。

### 常用语

- 能分类、搜索、置顶、复制；
- 模板变量缺失时有明确提示；
- 可从剪贴板创建；
- 导出后可完整恢复。

### 文本工作台

- 每个处理器有确定性单元测试；
- 还原不丢原始输入；
- 非法 JSON/Base64/正则显示错误，不覆盖结果；
- 管线执行顺序可追踪。

### 词库

- 未连接万象也能维护内部词库；
- bookmark 跨脚本重启仍可恢复；
- 能解析已有 `custom_phrase.txt`；
- 提交前可看差异；
- 外部文件发生变化时禁止盲写；
- 每次提交都有备份；
- 不触碰 userdb、gram 和官方 dicts。

### 整体

- 五个 Tab 与已确认 UI 草图一致；
- 深浅色与动态字体可用；
- 关闭 UI 后正常 `Script.exit()`；
- 关键错误均可恢复，不产生半写入文件。

## 9. 版本路线

### v0.1 / MVP

- 五个主 Tab；
- 文本/URL 剪贴板；
- 常用语和模板；
- 基础文本处理；
- 内部词库；
- 万象 `custom_phrase.txt` 连接、差异与安全提交；
- 完整数据导入导出。

### v0.2

- 图片剪贴板完善；
- 固定词典 `toolbox_words.dict.yaml`；
- 工作区回滚 UI；
- 处理管线编辑器；
- iPad 自适应布局。

### v1.0

- Intent / 分享面板；
- 快捷指令入口；
- 可选 iCloud 数据同步；
- 多工作区与其他 Rime 适配器；
- 小组件快捷入口。

## 10. 当前已锁定决策

- 产品独立，不依赖元书；
- 五个主模块和 iOS 原生视觉方向已通过；
- 万象作为外部适配器，而不是核心数据模型；
- 外部目录使用持久 bookmark；
- 数据层采用 SQLite + 文件资产 + Storage 设置；
- 外部写入必须差异预览、备份和冲突检测；
- 不直接修改任何 `*.userdb`、`.gram` 或官方 `dicts/`。
