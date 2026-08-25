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
        <Section header={<Text>剪贴板采集</Text>} footer={<Text>实时监听仅在工具箱脚本活跃期间工作；返回前台时会立即补采。</Text>}>
          <Toggle title="采集文本和链接" value={settings.captureText} onChanged={value => update({ captureText: value })} />
          <Toggle title="采集图片（开发中）" value={settings.captureImages} onChanged={value => update({ captureImages: value })} />
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

        <Section header={<Text>数据</Text>}>
          <Label title="本地 SQLite 数据库" systemImage="cylinder.split.1x2" />
          <Label title="导入与导出（开发中）" systemImage="arrow.up.arrow.down.square" />
          <Label title="iCloud 同步（后续版本）" systemImage="icloud" />
        </Section>

        <Section header={<Text>词库工作区</Text>} footer={<Text>外部目录只在用户授权后访问；任何写入都需要差异预览与确认。</Text>}>
          <Label title="在“词库”中连接目录" systemImage="folder.badge.plus" />
          <Label title="不修改 userdb、gram 和官方 dicts" systemImage="lock.shield" />
        </Section>

        <Section header={<Text>关于</Text>}>
          <HStack>
            <Text>数据结构</Text>
            <Spacer />
            <Text foregroundColor="secondary">v1</Text>
          </HStack>
          <HStack>
            <Text>工程阶段</Text>
            <Spacer />
            <Text foregroundColor="secondary">MVP 骨架</Text>
          </HStack>
        </Section>
      </Form>
    </NavigationStack>
  )
}
