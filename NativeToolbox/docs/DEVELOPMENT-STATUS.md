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

状态：代码完成，本地迁移回归通过，已准备远程发布 `v0.1.3`。

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

## Slice 3 建议顺序

1. 图片剪贴板资产落盘与预览；
2. 常用语 CRUD 和变量模板；
3. 内部词条 CRUD；
4. `custom_phrase.txt` 解析与差异预览；
5. 安全提交与回滚。
