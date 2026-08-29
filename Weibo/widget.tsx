import {
  HStack,
  Image,
  Link,
  Rectangle,
  Spacer,
  Text,
  VStack,
  Widget,
  ZStack,
  fetch,
} from 'scripting'
import { getSettings } from './store/settings'
import { WEIBO_WIDGET_BG_BASE64 } from './assets/weibo-widget-bg-base64'

function GradientBackground() {
  const size = Widget.displaySize
  // 图片随 bundle 内嵌，避免 Widget 扩展的文件路径与 Script 全局限制。
  const backgroundImage = UIImage.fromBase64String(WEIBO_WIDGET_BG_BASE64)
  if (!backgroundImage) {
    console.error('微博热搜 Base64 背景图解码失败')
  }
  return (
    <ZStack frame={size} alignment='topLeading'>
      <Rectangle fill='#1C1C1E' frame={size} />
      {backgroundImage ? (
        <Image
          image={backgroundImage}
          resizable
          scaleToFill
          interpolation='high'
          renderingMode='original'
          widgetAccentedRenderingMode='fullColor'
          frame={size}
        />
      ) : null}
      {/* 参考 IP 信息概览：左侧文字区压暗，向右平滑透出背景图。 */}
      <Rectangle
        fill={{
          gradient: [
            { color: 'rgba(28,28,30,0.68)', location: 0.00 },
            { color: 'rgba(28,28,30,0.56)', location: 0.38 },
            { color: 'rgba(28,28,30,0.24)', location: 0.62 },
            { color: 'rgba(28,28,30,0.00)', location: 0.82 },
            { color: 'rgba(28,28,30,0.00)', location: 1.00 },
          ],
          startPoint: { x: 0, y: 0.5 },
          endPoint: { x: 1, y: 0.5 },
        }}
        frame={size}
      />
      {/* 顶部与底部轻微晕影，让图片自然融入组件边缘。 */}
      <Rectangle
        fill={{
          gradient: [
            { color: 'rgba(12,12,14,0.18)', location: 0.00 },
            { color: 'rgba(28,28,30,0.00)', location: 0.24 },
            { color: 'rgba(28,28,30,0.00)', location: 0.76 },
            { color: 'rgba(12,12,14,0.22)', location: 1.00 },
          ],
          startPoint: { x: 0.5, y: 0 },
          endPoint: { x: 0.5, y: 1 },
        }}
        frame={size}
      />
    </ZStack>
  )
}

function WidgetView({ list }: { list: any[] }) {
  const settings = getSettings()
  const { height } = Widget.displaySize
  const paddingY = 12
  const fontSize = 11

  const standardItemHeight = fontSize + settings.gap
  const count = Math.floor(
    (height - paddingY * 2 + settings.gap) / standardItemHeight
  )
  const itemHeight = standardItemHeight + (height - paddingY * 2 - standardItemHeight * count) / count
  const logoLines = settings.logoSize
    ? Math.ceil(settings.logoSize / (fontSize + settings.gap))
    : 0
  const iconLength = (fontSize * 12) / 14
  const iconSize = { width: iconLength, height: iconLength }
  const now = new Date()

  // 小组件中自定义 scheme（weibointernational://）无法在桌面组件里直接打开，
  // 会回退启动宿主 App；统一用 https 链接，点击直接跳转 Safari 打开微博内容。
  const getItemLink = (item: any) => {
    const word = item.word || item.title || ''
    return `https://m.weibo.cn/search?containerid=${encodeURIComponent('100103type=1&t=10&q=' + word)}`
  }

  // Logo 链接统一用 https，点击直接跳转 Safari 打开热搜页。
  const hotSearchLink = `https://m.weibo.cn/p/index?containerid=${encodeURIComponent('106003&filter_type=realtimehot')}`

  return (
    <ZStack frame={Widget.displaySize} alignment='topLeading' widgetBackground='#1C1C1E'>
      <GradientBackground />
      <VStack padding={{ horizontal: 14, vertical: paddingY }} frame={Widget.displaySize} spacing={0}>
      {list.slice(0, count - logoLines).map((item, i) => (
        <HStack alignment='top'>
          <Link key={item.itemid} buttonStyle='plain' url={getItemLink(item)}>
            <HStack
              key={item.itemid}
              frame={{ height: itemHeight }}
              alignment='center'
            >
              <Text
                font={fontSize}
                fontWeight='bold'
                foregroundStyle={item.itemid <= 3 ? '#fe4f67' : '#f5c94c'}
              >
                {item.itemid}
              </Text>
              <Text font={fontSize} foregroundStyle={settings.color}>
                {item.title}
              </Text>
              <Image
                imageUrl={item.icon || item.pic}
                frame={iconSize}
                widgetAccentedRenderingMode={settings.renderingMode}
                resizable
              />
              <Spacer />
            </HStack>
          </Link>
          {i === 0 ? (
            // 时钟仅作时间展示，不可点击：AppIntent 会启动 App，且 SwiftUI 不允许 Link 套 Link。
            <HStack spacing={2}>
              <Image
                systemName='clock.arrow.circlepath'
                font={settings.fontSize * 0.7}
                foregroundStyle={settings.timeColor}
              />
              <Text
                font={settings.fontSize * 0.7}
                foregroundStyle={settings.timeColor}
              >
                {`${now.getHours()}`.padStart(2, '0')}:
                {`${now.getMinutes()}`.padStart(2, '0')}
              </Text>
            </HStack>
          ) : null}
        </HStack>
      ))}
      <HStack alignment='bottom'>
        <VStack spacing={0}>
          {list.slice(count - logoLines, count).map((item, i) => (
            <Link key={item.itemid} buttonStyle='plain' url={getItemLink(item)}>
              <HStack
                key={item.itemid}
                frame={{ height: itemHeight }}
                alignment='center'
              >
                <Text
                  font={fontSize}
                  fontWeight='bold'
                  foregroundStyle={item.itemid <= 3 ? '#fe4f67' : '#f5c94c'}
                >
                  {item.itemid}
                </Text>
                <Text font={fontSize} foregroundStyle={settings.color}>
                  {item.title}
                </Text>
                <Image
                  imageUrl={item.icon || item.pic}
                  frame={iconSize}
                  widgetAccentedRenderingMode={settings.renderingMode}
                  resizable
                />
                <Spacer />
              </HStack>
            </Link>
          ))}
        </VStack>
        <Link url={hotSearchLink}>
          <Image
            imageUrl='https://www.sinaimg.cn/blog/developer/wiki/LOGO_64x64.png'
            frame={{ width: settings.logoSize, height: settings.logoSize }}
            widgetAccentedRenderingMode={settings.renderingMode}
            resizable
          />
        </Link>
      </HStack>
      </VStack>
    </ZStack>
  )
}

function EmptyWidget({ message }: { message: string }) {
  const settings = getSettings()
  return (
    <ZStack frame={Widget.displaySize} alignment='center' widgetBackground='#1C1C1E'>
      <GradientBackground />
      <VStack spacing={8} frame={Widget.displaySize}>
        <Image systemName='exclamationmark.arrow.triangle.2.circlepath' font={24} foregroundStyle='#fe4f67' />
        <Text font={11} foregroundStyle={settings.color}>{message}</Text>
      </VStack>
    </ZStack>
  )
}

;(async () => {
  const url = 'https://weibointl.api.weibo.cn/portal.php?ct=feed&a=search_hot'
  try {
    const response = await fetch(url)
    const payload = await response.json()
    const list = Array.isArray(payload?.data) ? payload.data : []
    Widget.present(
      list.length > 0
        ? <WidgetView list={list} />
        : <EmptyWidget message='暂无微博热搜数据' />
    )
  } catch (error) {
    console.error('微博热搜小组件加载失败:', error)
    Widget.present(<EmptyWidget message='微博热搜加载失败，请稍后刷新' />)
  }
})()
