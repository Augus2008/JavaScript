# NativeToolbox

基于 [Scripting](https://scriptingapp.github.io/) 的独立 iOS 原生文本效率工具箱。

## 当前版本

`v0.1.7 MVP`

当前已经可以运行：

- 五个原生 Tab；
- 正式 SQLite 迁移系统（`001-initial`）；
- 旧数据库兼容升级、迁移前备份、结构校验；
- 文本/URL 剪贴板采集、搜索、筛选、收藏、删除、复制；
- 前台监听和返回前台补采；
- 基础文本处理；
- 设置持久化；
- 外部万象/通用目录 bookmark 连接与识别；
- 常用语分类、搜索、收藏、复制、编辑删除、从剪贴板创建；
- 模板变量 `{{date}}` / `{{time}}` / `{{datetime}}` / `{{clipboard}}`，缺变量会提示。

- 内部词条新建、编辑、搜索、删除、复制；未连接万象也可独立维护。

图片采集和万象词库实际写入仍在开发中。

## Scripting 远程安装入口

Scripting 的“导入远程脚本”要求输入 **GitHub 仓库或脚本目录 URL**，并通过目录中的 `script.json` 识别项目；不能使用返回 `text/plain` 的 Raw 单文件 URL。

安装地址：

```text
https://github.com/Augus2008/JavaScript/tree/main/NativeToolbox
```

项目元数据：

```text
NativeToolbox/script.json
```

正式运行入口仍是根目录的单文件：

```text
NativeToolbox/index.tsx
```

安装后，Scripting 会依据 `script.json` 中的 `remoteResource.url` 跟踪该目录；以后仓库更新后可直接使用远程脚本更新功能同步。

## 目录结构

```text
NativeToolbox/
├─ index.tsx          # 单文件正式运行入口
├─ script.json        # Scripting 安装、展示和远程更新元数据
├─ README.md
├─ src/               # 模块化开发源码
│  ├─ index.tsx
│  ├─ app/
│  ├─ features/
│  ├─ migrations/     # SQLite 正式迁移
│  ├─ models/
│  └─ services/
└─ docs/
   ├─ product-spec-v0.1.md
   └─ DEVELOPMENT-STATUS.md
```

## 运行要求

- 使用新版 Scripting；
- iOS 设置 → Scripting → 从其他 App 粘贴 → 允许；
- 首次运行时允许剪贴板权限；
- 使用外部词库时授权文件目录。

## 数据安全

- 工具箱数据存放在自己的 Documents/SQLite 中；
- 万象只是可选的外部工作区；
- 当前版本不会写入外部词库；
- 后续词库提交将采用哈希冲突检测、差异预览、备份和回滚；
- 不修改 `*.userdb`、`.gram` 和官方 `dicts/`。

## 开发约定

- `src/` 是模块化源码；
- 发布前把 `src/index.tsx` 打包为根目录 `index.tsx`；
- 根目录 `index.tsx` 必须保持零本地模块依赖；
- `FileManager`、`Pasteboard`、`Storage`、`Crypto`、`Data`、`UUID`、`DocumentPicker`、`SQLite` 使用 Scripting 全局命名空间，不从 `scripting` 包导入；
- `Path` 和 UI 组件从 `scripting` 包导入。
