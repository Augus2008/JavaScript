import {
  Button,
  ContentUnavailableView,
  HStack,
  Image,
  Label,
  List,
  NavigationStack,
  Section,
  Spacer,
  Text,
  VStack,
  useEffect,
  useState,
} from "scripting"
import type { Workspace } from "../../models/types"
import { listWorkspaces, removeWorkspace, upsertWorkspace } from "../../services/database"
import { chooseAndConnectWorkspace, refreshWorkspace } from "../../services/workspace-bookmarks"

function WorkspaceRow({ workspace, reload }: { workspace: Workspace; reload: () => void }) {
  const connected = workspace.status === "connected"
  return (
    <HStack spacing={12}
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
      <Image systemName="square.stack.3d.up.fill" foregroundColor="systemIndigo" />
      <VStack alignment="leading" spacing={4}>
        <Text font="headline">{workspace.name}</Text>
        <Text font="caption" foregroundColor="secondary">
          {workspace.type === "wanxiang" ? `Base · v${workspace.version ?? "未知"}` : "通用目录"}
        </Text>
        <Text font="caption2" foregroundColor="secondary" lineLimit={1}>{workspace.display_path}</Text>
      </VStack>
      <Spacer />
      <VStack alignment="trailing">
        <Image systemName={connected ? "checkmark.circle.fill" : "exclamationmark.circle.fill"} foregroundColor={connected ? "systemGreen" : "systemOrange"} />
        <Text font="caption2" foregroundColor="secondary">{connected ? "已连接" : "需重新授权"}</Text>
      </VStack>
    </HStack>
  )
}

export function LexiconScreen() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = () => {
    listWorkspaces().then(async rows => {
      const refreshed: Workspace[] = []
      for (const row of rows) {
        const value = await refreshWorkspace(row)
        await upsertWorkspace(value)
        refreshed.push(value)
      }
      setWorkspaces(refreshed)
    }).catch(e => setError(String(e))).finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  const connect = async () => {
    setError(null)
    try {
      await chooseAndConnectWorkspace()
      reload()
    } catch (e) {
      setError(String(e))
    }
  }

  const overlay = error != null
    ? <ContentUnavailableView title="无法连接词库" systemImage="exclamationmark.triangle" description={error} />
    : (!loading && workspaces.length === 0
      ? <ContentUnavailableView
          label={<Text>还没有词库工作区</Text>}
          description={<Text>工具箱可以独立维护词条；也可以授权一个万象目录。</Text>}
          actions={[<Button title="连接外部目录" systemImage="folder.badge.plus" action={connect} />]}
        />
      : undefined)

  return (
    <NavigationStack>
      <List
        navigationTitle="词库中心"
        navigationBarTitleDisplayMode="large"
        listStyle="insetGrouped"
        overlay={overlay}
      >
        <Section>
          <Button title="连接外部目录" systemImage="folder.badge.plus" action={connect} />
        </Section>
        {workspaces.length > 0 && <Section header={<Text>工作区</Text>}>
          {workspaces.map(workspace => <WorkspaceRow key={workspace.id} workspace={workspace} reload={reload} />)}
        </Section>}
        <Section header={<Text>内部词库</Text>} footer={<Text>词条编辑与万象差异提交将在下一开发切片启用。</Text>}>
          <Label title="0 个词条" systemImage="text.book.closed" />
          <Label title="0 项待提交" systemImage="arrow.triangle.2.circlepath" />
        </Section>
      </List>
    </NavigationStack>
  )
}
