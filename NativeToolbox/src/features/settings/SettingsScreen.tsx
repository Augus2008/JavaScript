import {
  Form,
  HStack,
  Label,
  NavigationStack,
  Picker,
  Section,
  Spacer,
  Stepper,
  Text,
  Toggle,
  useState,
} from "scripting"
import type { AppSettings, DuplicatePolicy } from "../../models/types"
import { loadSettings, saveSettings } from "../../services/pasteboard"

export function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  return (
    <NavigationStack>
      <Form
        navigationTitle="设置"
        navigationBarTitleDisplayMode="large"
        formStyle="grouped"
      >
        <Section header={<Text>剪贴板</Text>} footer={<Text>脚本在前台时监听；回到前台会补采。点列表即可复制。</Text>}>
          <Toggle title="采集文本和链接" value={settings.captureText} onChanged={value => update({ captureText: value })} />
          <Picker
            title="重复内容"
            value={settings.duplicatePolicy}
            onChanged={value => update({ duplicatePolicy: value as DuplicatePolicy })}
          >
            <Text tag="ignore">忽略</Text>
            <Text tag="moveToTop">更新到顶部</Text>
            <Text tag="keepCopy">保留副本</Text>
          </Picker>
          <Stepper
            title={`最多保留 ${settings.maxItems} 条`}
            onIncrement={() => update({ maxItems: Math.min(2000, settings.maxItems + 100) })}
            onDecrement={() => update({ maxItems: Math.max(100, settings.maxItems - 100) })}
          />
          <Stepper
            title={settings.retentionDays === 0 ? "永久保留非收藏" : `保留 ${settings.retentionDays} 天`}
            onIncrement={() => update({ retentionDays: Math.min(365, settings.retentionDays + 5) })}
            onDecrement={() => update({ retentionDays: Math.max(0, settings.retentionDays - 5) })}
          />
        </Section>

        <Section header={<Text>词库</Text>} footer={<Text>连接目录、预览差异和提交都在「词库」页完成。不会修改 userdb、gram 或官方 dicts。</Text>}>
          <HStack>
            <Text>写入方式</Text>
            <Spacer />
            <Text foregroundColor="secondary">预览后确认</Text>
          </HStack>
        </Section>

        <Section header={<Text>关于</Text>}>
          <HStack>
            <Text>版本</Text>
            <Spacer />
            <Text foregroundColor="secondary">0.2.3</Text>
          </HStack>
          <HStack>
            <Text>数据</Text>
            <Spacer />
            <Text foregroundColor="secondary">本机 SQLite</Text>
          </HStack>
        </Section>
      </Form>
    </NavigationStack>
  )
}
