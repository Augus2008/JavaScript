# NativeToolbox 开发状态

更新时间：2026-08-25

## Slice 1：工程骨架与核心底座

状态：代码完成，静态验收通过，待 Scripting 实机运行验收。

### 完成

- [x] 五 Tab 原生根视图
- [x] SQLite v1 Schema
- [x] 文本/URL Pasteboard 采集
- [x] changeCount 补采
- [x] 前台变化监听与清理
- [x] 剪贴板搜索/筛选/收藏/删除/复制
- [x] 去重与清理设置
- [x] Storage 设置持久化
- [x] 文本工作台基础处理器
- [x] 万象/通用目录 bookmark 授权与识别
- [x] 空状态与错误状态
- [x] TSX 静态编译
- [x] 文本处理单元测试
- [x] SQLite Schema 镜像测试
- [x] ZIP 源码包

### 待实机验收

- [ ] Scripting 成功导入项目
- [ ] 首次运行数据库成功初始化
- [ ] 五 Tab 原生显示正常
- [ ] Pasteboard 权限提示及采集正常
- [ ] Swipe Actions 正常
- [ ] EditorController 正常显示与释放
- [ ] DocumentPicker bookmark 跨运行恢复

## Slice 2 建议顺序

1. 修复首次实机运行发现的 API/布局差异；
2. 图片剪贴板资产落盘；
3. 常用语 CRUD 和变量模板；
4. 内部词条 CRUD；
5. `custom_phrase.txt` 解析与差异预览；
6. 安全提交与回滚。
