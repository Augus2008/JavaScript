# NativeToolbox 开发状态

更新时间：2026-08-25

## Slice 1：工程骨架与核心底座

状态：已完成并通过静态验收，Scripting 可运行。

### 完成

- [x] 五 Tab 原生根视图
- [x] 文本/URL Pasteboard 采集
- [x] changeCount 补采
- [x] 前台变化监听与清理
- [x] 剪贴板搜索/筛选/收藏/删除/复制
- [x] 去重与清理设置
- [x] Storage 设置持久化
- [x] 文本工作台基础处理器
- [x] 万象/通用目录 bookmark 授权与识别
- [x] 空状态与错误状态
- [x] 远程项目元数据 `script.json`
- [x] GitHub 远程安装目录

## Slice 2：正式 SQLite 初始迁移

状态：已发布 `v0.1.5`。

### 运行时热修复（v0.1.5）

- [x] 旧库升级前不再执行 `PRAGMA wal_checkpoint(FULL)`（Scripting 额外读连接会导致 SQLITE_LOCKED / error 6）
- [x] 改为 `PASSIVE` 检查点，失败不阻断启动
- [x] 备份失败也不阻断迁移

### 运行时热修复（v0.1.4）

### 运行时热修复（v0.1.4）

- [x] 不再调用 `db.tableExists` / `db.columnsIn`（可选 schema 参数会被桥接成字符串 `"undefined"`）
- [x] 改用 `sqlite_master` 与 `PRAGMA table_info` 做表/列检测
- [x] 重新打包单文件入口并远程发布

### 完成

- [x] `src/migrations/001-initial.ts`
- [x] `src/migrations/index.ts` 迁移执行器
- [x] `schema_migrations` 版本与 checksum 记录
- [x] 动态 steps checksum 校验
- [x] 旧 `schema_meta` 兼容识别
- [x] 迁移前 WAL checkpoint + 数据库备份
- [x] 启动后 Schema 结构校验
- [x] 补齐 `tags` / `clipboard_tags`
- [x] 词库、工作区、变更队列索引
- [x] 重复 bookmark 连接复用原记录
- [x] 新库首次迁移测试
- [x] 旧库数据保留升级测试
- [x] 重复启动幂等测试
- [x] 失败事务回滚测试
- [x] checksum 篡改拒绝测试
- [x] 单文件入口重新打包
- [x] 全局命名空间与敏感信息扫描

### 兼容说明

- 已生成的 `toolbox.sqlite` 不会被清空；
- 剪贴板现有数据会保留；
- 旧库不会为补外键而重建业务表；
- 新库使用完整约束与索引。

## Slice 3：常用语 CRUD

状态：已发布 `v0.1.6`。

### 完成

- [x] `snippets` / `snippet_categories` 查询与 upsert
- [x] 新建、编辑、删除、收藏、复制
- [x] 全部 / 收藏筛选 + 分类筛选
- [x] 从剪贴板创建常用语
- [x] 模板变量 `{{date}}` `{{time}}` `{{datetime}}` `{{clipboard}}`
- [x] 缺变量提示，不静默删除 token
- [x] 单文件入口重新打包
- [x] 模板渲染测试与敏感信息扫描

### 明确不做（本切片）

- JSON / CSV 导入导出
- 分类重命名与排序管理
- 复杂自定义变量表单

## Slice 4：内部词条 CRUD

状态：已发布 `v0.1.9`。

### 热修复（v0.1.9）

- [x] 修复词库空状态 JSX 写成 `<ContentUnavailableView}` 导致无法启动
- [x] 去掉系统 `searchable` / `navigationBarDrawer`，改用列表内常驻搜索框

### 热修复（v0.1.8）

- [x] 内部词库增加列表内常驻搜索框
- [x] 系统搜索栏改为 `navigationBarDrawer`，不必下拉才出现

### 完成

- [x] `lexicon_entries` 查询、计数、upsert、删除
- [x] 词库页内部词条列表、搜索、新建、编辑、删除、复制
- [x] 未连接万象也可独立维护词条
- [x] 外部工作区仍只连接/识别，不写入
- [x] 单文件入口重新打包与敏感信息扫描

### 明确不做（本切片）

- CSV / JSON / TXT 导入导出
- 万象 `custom_phrase.txt` 解析与提交
- 待提交队列与差异预览

## Slice 5：custom_phrase 只读差异预览

状态：已发布 `v0.2.0`。

### 完成

- [x] 解析 `custom_phrase.txt`（Tab 分隔，拒绝空格假冒）
- [x] 与内部词条按 词语+编码 对比
- [x] 预览新增 / 权重更新 / 已一致 / 仅外部存在 / 异常行
- [x] 无编码内部词条不进入差异
- [x] 明确不写入外部文件

### 明确不做（本切片）

- 写入 `custom_phrase.txt`
- 备份、冲突提交、回滚
- 修改 userdb / gram / 官方 dicts

## Slice 6 建议顺序

1. custom_phrase 安全提交与备份；
2. 冲突检测与回滚。
