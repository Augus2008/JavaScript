import {
  Button,
  HStack,
  Image,
  List,
  NavigationLink,
  NavigationStack,
  Picker,
  Script,
  Section,
  Spacer,
  Text,
  Toggle,
  VStack,
  useEffect,
  useState,
} from "scripting"
import type { Workspace } from "../../models/types"
import {
  listWorkspaces,
  removeWorkspace,
  upsertWorkspace,
} from "../../services/database"
import { loadPreferences, updatePreferences, type StartupTab } from "../../services/preferences"
import { chooseAndConnectWorkspace, refreshWorkspace } from "../../services/workspace-bookmarks"

function SettingsIcon({
  systemName,
  color,
}: {
  systemName: string
  color: string
}) {
  return (
    <Image
      systemName={systemName}
      foregroundColor="white"
      imageScale="small"
      frame={{ width: 29, height: 29 }}
      background={color}
      clipShape={{
        type: "rect",
        cornerRadius: 6,
      }}
    />
  )
}

function SettingsRow({
  title,
  subtitle,
  systemName,
  color,
}: {
  title: string
  subtitle: string
  systemName: string
  color: string
}) {
  return (
    <HStack spacing={12}>
      <SettingsIcon systemName={systemName} color={color} />
      <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text>{title}</Text>
        <Text font="caption" foregroundColor="secondary">{subtitle}</Text>
      </VStack>
    </HStack>
  )
}

function workspaceSummary(workspaces: Workspace[]) {
  const connected = workspaces.find(item => item.status === "connected")
  if (connected == null) {
    return workspaces.length > 0 ? "需重新授权" : "未连接"
  }
  if (connected.type === "wanxiang") {
    return `万象 · v${connected.version ?? "未知"}`
  }
  return connected.name
}

function HabitsPage() {
  const initial = loadPreferences()
  const [startupTab, setStartupTab] = useState<StartupTab>(initial.startupTab)
  const [copyFeedback, setCopyFeedback] = useState(initial.copyFeedback)

  const changeStartup = (value: string) => {
    const next = value === "snippets" ? "snippets" : "lexicon"
    setStartupTab(next)
    updatePreferences({ startupTab: next })
  }

  const changeCopyFeedback = (value: boolean) => {
    setCopyFeedback(value)
    updatePreferences({ copyFeedback: value })
  }

  return (
    <List
      navigationTitle="使用习惯"
      navigationBarTitleDisplayMode="inline"
      listStyle="insetGrouped"
    >
      <Section footer={<Text>下次打开工具箱时生效，不会立刻切换当前 Tab。</Text>}>
        <Picker title="启动打开" value={startupTab} onChanged={changeStartup}>
          <Text tag="lexicon">词库</Text>
          <Text tag="snippets">常用语</Text>
        </Picker>
      </Section>
      <Section footer={<Text>点按复制成功后，短暂显示「已复制」。关闭后仍会写入剪贴板。</Text>}>
        <Toggle title="复制后提示" value={copyFeedback} onChanged={changeCopyFeedback} />
      </Section>
    </List>
  )
}

function SafetyPage() {
  return (
    <List
      navigationTitle="词库安全"
      navigationBarTitleDisplayMode="inline"
      listStyle="insetGrouped"
    >
      <Section footer={<Text>连接目录、预览差异、导入和提交都在「词库」页完成。</Text>}>
        <HStack>
          <Text>写入方式</Text>
          <Spacer />
          <Text foregroundColor="secondary">预览后确认</Text>
        </HStack>
        <HStack>
          <Text>冲突保护</Text>
          <Spacer />
          <Text foregroundColor="secondary">文件哈希校验</Text>
        </HStack>
        <HStack>
          <Text>提交备份</Text>
          <Spacer />
          <Text foregroundColor="secondary">ToolboxBackups</Text>
        </HStack>
      </Section>
      <Section footer={<Text>工具箱只维护内部词库和万象 custom_phrase.txt。</Text>}>
        <HStack>
          <Text>userdb / gram</Text>
          <Spacer />
          <Text foregroundColor="secondary">不修改</Text>
        </HStack>
        <HStack>
          <Text>官方 dicts</Text>
          <Spacer />
          <Text foregroundColor="secondary">不修改</Text>
        </HStack>
        <HStack>
          <Text>重新部署</Text>
          <Spacer />
          <Text foregroundColor="secondary">手动完成</Text>
        </HStack>
      </Section>
    </List>
  )
}

function AboutPage() {
  return (
    <List
      navigationTitle="关于"
      navigationBarTitleDisplayMode="inline"
      listStyle="insetGrouped"
    >
      <Section>
        <HStack>
          <Text>版本</Text>
          <Spacer />
          <Text foregroundColor="secondary">{Script.metadata.version}</Text>
        </HStack>
        <HStack>
          <Text>内部数据</Text>
          <Spacer />
          <Text foregroundColor="secondary">本机 SQLite</Text>
        </HStack>
      </Section>
      <Section footer={<Text>数据在 Scripting 的 Documents/NativeToolbox，不写入万象官方词库。</Text>}>
        <Text foregroundColor="secondary">NativeToolbox 是独立的文本效率工具箱。万象只是可选的外部工作区。</Text>
      </Section>
    </List>
  )
}

function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [error, setError] = useState<string | null>(null)

  const reload = () => {
    listWorkspaces()
      .then(async rows => {
        const refreshed: Workspace[] = []
        for (const row of rows) {
          const value = await refreshWorkspace(row)
          await upsertWorkspace(value)
          refreshed.push(value)
        }
        setWorkspaces(refreshed)
        setError(null)
      })
      .catch(e => setError(String(e)))
  }

  useEffect(() => {
    reload()
  }, [])

  const connect = async () => {
    try {
      await chooseAndConnectWorkspace()
      reload()
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <List
      navigationTitle="工作区"
      navigationBarTitleDisplayMode="inline"
      listStyle="insetGrouped"
      toolbar={{
        topBarTrailing: <Button title="连接目录" systemImage="folder.badge.plus" action={connect} />,
      }}
    >
      {error != null && (
        <Section>
          <Text foregroundColor="secondary">{error}</Text>
        </Section>
      )}
      <Section footer={<Text>预览差异和提交仍在「词库」页。这里只管理授权目录。</Text>}>
        {workspaces.length === 0 ? (
          <Text foregroundColor="secondary">还没有连接外部目录。</Text>
        ) : workspaces.map(workspace => (
          <HStack
            key={workspace.id}
            spacing={12}
            trailingSwipeActions={{
              actions: [
                <Button
                  title="断开"
                  systemImage="link.badge.minus"
                  role="destructive"
                  action={async () => {
                    await removeWorkspace(workspace.id)
                    reload()
                  }}
                />,
              ],
            }}
          >
            <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }}>
              <Text>{workspace.name}</Text>
              <Text font="caption" foregroundColor="secondary">
                {workspace.type === "wanxiang" ? `Base · v${workspace.version ?? "未知"}` : "通用目录"}
                {workspace.status === "connected" ? " · 已连接" : " · 需重新授权"}
              </Text>
              <Text font="caption2" foregroundColor="secondary" lineLimit={1}>{workspace.display_path}</Text>
            </VStack>
          </HStack>
        ))}
      </Section>
    </List>
  )
}

export function SettingsScreen() {
  const [summary, setSummary] = useState("未连接")

  useEffect(() => {
    listWorkspaces()
      .then(async rows => {
        const refreshed: Workspace[] = []
        for (const row of rows) {
          refreshed.push(await refreshWorkspace(row))
        }
        setSummary(workspaceSummary(refreshed))
      })
      .catch(() => setSummary("无法读取"))
  }, [])

  return (
    <NavigationStack>
      <List
        navigationTitle="设置"
        navigationBarTitleDisplayMode="large"
        listStyle="insetGrouped"
      >
        <Section header={<Text>使用</Text>}>
          <NavigationLink destination={<HabitsPage />}>
            <SettingsRow
              title="使用习惯"
              subtitle="启动页与复制提示"
              systemName="slider.horizontal.3"
              color="systemBlue"
            />
          </NavigationLink>
        </Section>
        <Section header={<Text>词库</Text>}>
          <NavigationLink destination={<WorkspacePage />}>
            <SettingsRow
              title="工作区"
              subtitle={summary}
              systemName="folder.fill"
              color="systemIndigo"
            />
          </NavigationLink>
          <NavigationLink destination={<SafetyPage />}>
            <SettingsRow
              title="词库安全"
              subtitle="预览后确认，提交前备份"
              systemName="lock.shield.fill"
              color="systemTeal"
            />
          </NavigationLink>
        </Section>
        <Section header={<Text>关于</Text>}>
          <NavigationLink destination={<AboutPage />}>
            <SettingsRow
              title="关于"
              subtitle={`版本 ${Script.metadata.version}`}
              systemName="info.circle.fill"
              color="systemGray"
            />
          </NavigationLink>
        </Section>
      </List>
    </NavigationStack>
  )
}
