import {
  Form,
  HStack,
  NavigationStack,
  Section,
  Spacer,
  Text,
} from "scripting"

export function SettingsScreen() {
  return (
    <NavigationStack>
      <Form
        navigationTitle="设置"
        navigationBarTitleDisplayMode="large"
        formStyle="grouped"
      >
        <Section
          header={<Text>词库安全</Text>}
          footer={<Text>连接目录、预览差异、导入和提交都在「词库」页完成。</Text>}
        >
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

        <Section
          header={<Text>保护范围</Text>}
          footer={<Text>工具箱只维护内部词库和万象 custom_phrase.txt。</Text>}
        >
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

        <Section header={<Text>关于</Text>}>
          <HStack>
            <Text>版本</Text>
            <Spacer />
            <Text foregroundColor="secondary">0.4.0</Text>
          </HStack>
          <HStack>
            <Text>内部数据</Text>
            <Spacer />
            <Text foregroundColor="secondary">本机 SQLite</Text>
          </HStack>
        </Section>
      </Form>
    </NavigationStack>
  )
}
