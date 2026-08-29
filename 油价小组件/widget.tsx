import {
  Capsule,
  Circle,
  HStack,
  Image,
  Rectangle,
  RoundedRectangle,
  Spacer,
  Text,
  VStack,
  Widget,
  ZStack,
} from 'scripting'
import type { CompleteOilData } from './utils/oil-price-service'
import {
  formatForecastPrice,
  getCompleteOilData,
  getCurrentSettings,
  getDynamicTextColor,
  getMediumWidgetOilPriceItems,
  getSmallWidgetOilPriceItem,
  getTrendColor,
  getTrendSymbol
} from './utils/oil-price-service'

// 全局数据变量
let oilData: CompleteOilData | null = null

/**
 * 生成背景样式
 */
const generateWidgetBackground = (settings: any) => {
  // 如果开启了颜色背景，优先使用颜色背景
  if (settings.enableColorBackground && settings.backgroundColors && settings.backgroundColors.length > 0) {
    const colors = settings.backgroundColors

    if (colors.length === 1) {
      // 单个颜色，使用纯色背景
      return colors[0]
    } else {
      // 多个颜色，使用渐变背景
      return {
        gradient: colors.map((color: any, index: number) => ({
          color: color,
          location: index / (colors.length - 1)
        })),
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 1, y: 1 }
      }
    }
  }

  return undefined
}

const OIL_GLASS_BACKGROUND = {
  gradient: [
    { color: '#252A34', location: 0.00 },
    { color: '#1C1C1E', location: 0.46 },
    { color: '#241A1C', location: 0.76 },
    { color: '#301A18', location: 1.00 },
  ],
  startPoint: { x: 0, y: 0.38 },
  endPoint: { x: 1, y: 0.62 },
}

const OIL_VERTICAL_VIGNETTE = {
  gradient: [
    { color: 'rgba(8,10,14,0.24)', location: 0.00 },
    { color: 'rgba(28,28,30,0.00)', location: 0.28 },
    { color: 'rgba(28,28,30,0.00)', location: 0.72 },
    { color: 'rgba(6,7,10,0.30)', location: 1.00 },
  ],
  startPoint: { x: 0.5, y: 0 },
  endPoint: { x: 0.5, y: 1 },
}

const OIL_ACCENT_GRADIENT = {
  gradient: [
    { color: 'rgba(255,159,10,0.52)', location: 0.00 },
    { color: 'rgba(255,107,53,0.46)', location: 0.52 },
    { color: 'rgba(235,96,77,0.40)', location: 1.00 },
  ],
  startPoint: { x: 0, y: 0.5 },
  endPoint: { x: 1, y: 0.5 },
}

const DashboardDecoration = ({
  width,
  height,
  direction,
}: {
  width: number
  height: number
  direction: 'rising' | 'falling' | 'stranded'
}) => {
  // 轴心落在 98# 与 0# 卡片的横向缝隙；指针伸向左上空白区。
  const diameter = Math.min(170, height * 1.04)
  const centerX = width * 0.74
  const centerY = height * 0.40
  const trendColor = direction === 'rising' ? '#FF5E57' : direction === 'falling' ? '#30D158' : '#FF9F0A'
  const trendArcColor = direction === 'rising'
    ? 'rgba(255,94,87,0.42)'
    : direction === 'falling'
      ? 'rgba(48,209,88,0.42)'
      : 'rgba(255,159,10,0.42)'
  const trendMuted = direction === 'rising'
    ? 'rgba(255,94,87,0.22)'
    : direction === 'falling'
      ? 'rgba(48,209,88,0.22)'
      : 'rgba(255,159,10,0.22)'
  const trendLabel = direction === 'rising' ? '上涨' : direction === 'falling' ? '下跌' : '搁浅'

  return (
    <ZStack frame={{ width, height }} alignment="topLeading">
      <Rectangle fill="#1C1C1E" frame={{ width, height }} />
      <Rectangle fill={OIL_GLASS_BACKGROUND} frame={{ width, height }} />
      <Circle
        fill={{
          gradient: [
            { color: 'rgba(84,108,145,0.13)', location: 0.00 },
            { color: 'rgba(69,85,112,0.045)', location: 0.54 },
            { color: 'rgba(69,85,112,0.00)', location: 1.00 },
          ],
          center: { x: 0.5, y: 0.5 },
          startRadius: 0,
          endRadius: diameter * 0.62,
        }}
        frame={{ width: diameter * 1.28, height: diameter * 1.28 }}
        position={{ x: width * 0.10, y: height * 0.18 }}
      />
      <Circle
        fill={{
          gradient: [
            { color: 'rgba(255,107,53,0.16)', location: 0.00 },
            { color: 'rgba(235,96,77,0.055)', location: 0.52 },
            { color: 'rgba(235,96,77,0.00)', location: 1.00 },
          ],
          center: { x: 0.5, y: 0.5 },
          startRadius: 0,
          endRadius: diameter * 0.68,
        }}
        frame={{ width: diameter * 1.42, height: diameter * 1.42 }}
        position={{ x: width * 0.88, y: height * 0.54 }}
      />
      <Rectangle fill={OIL_VERTICAL_VIGNETTE} frame={{ width, height }} />
      <Circle
        fill={
          direction === 'rising'
            ? 'rgba(255,94,87,0.045)'
            : direction === 'falling'
              ? 'rgba(48,209,88,0.045)'
              : 'rgba(255,159,10,0.045)'
        }
        frame={{ width: diameter, height: diameter }}
        position={{ x: centerX, y: centerY }}
      />
      <Circle
        fill="clear"
        stroke={{
          shapeStyle: 'rgba(255,255,255,0.055)',
          strokeStyle: { lineWidth: 2 },
        }}
        frame={{ width: diameter, height: diameter }}
        position={{ x: centerX, y: centerY }}
      />
      <Circle
        fill="clear"
        trim={{ from: 0.08, to: 0.92 }}
        stroke={{
          shapeStyle: trendMuted,
          strokeStyle: { lineWidth: 6, lineCap: 'round', dash: [2, 7] },
        }}
        frame={{ width: diameter - 8, height: diameter - 8 }}
        rotationEffect={42}
        position={{ x: centerX, y: centerY }}
      />
      <Circle
        fill="clear"
        trim={{ from: 0.10, to: direction === 'rising' ? 0.68 : direction === 'falling' ? 0.38 : 0.52 }}
        stroke={{
          shapeStyle: trendArcColor,
          strokeStyle: { lineWidth: 3, lineCap: 'round' },
        }}
        frame={{ width: diameter * 0.72, height: diameter * 0.72 }}
        rotationEffect={42}
        position={{ x: centerX, y: centerY }}
      />
      <Capsule
        fill={OIL_ACCENT_GRADIENT}
        frame={{ width: diameter * 0.38, height: 3 }}
        rotationEffect={45}
        position={{ x: centerX - diameter * 0.135, y: centerY - diameter * 0.135 }}
      />
      <Circle
        fill={trendColor}
        stroke={{ shapeStyle: 'rgba(255,255,255,0.72)', strokeStyle: { lineWidth: 0.8 } }}
        frame={{ width: 7, height: 7 }}
        position={{ x: centerX, y: centerY }}
      />
      <HStack
        spacing={3}
        alignment="center"
        position={{ x: centerX + diameter * 0.28, y: centerY - diameter * 0.30 }}
      >
        <Circle fill={trendColor} frame={{ width: 5, height: 5 }} />
        <Text font={8} fontWeight="semibold" foregroundStyle="rgba(245,245,247,0.72)">
          {trendLabel}
        </Text>
      </HStack>
    </ZStack>
  )
}

const MediumOilCard = ({
  item,
  direction,
  forecastPrice,
  width,
}: {
  item: { type: string; shortLabel: string; price: string }
  direction: 'rising' | 'falling' | 'stranded'
  forecastPrice: string
  width: number
}) => (
  <ZStack frame={{ width, height: 58 }} alignment="center">
    <RoundedRectangle
      cornerRadius={11}
      fill="rgba(255,255,255,0.075)"
      stroke={{ shapeStyle: 'rgba(255,255,255,0.11)', strokeStyle: { lineWidth: 0.7 } }}
      frame={{ width, height: 58 }}
    />
    <VStack spacing={1} alignment="center" frame={{ width: width - 8 }}>
      <HStack spacing={3} alignment="center">
        <Circle fill="#FF9F0A" frame={{ width: 4, height: 4 }} />
        <Text font={10} fontWeight="semibold" foregroundStyle="#FF8A65" lineLimit={1}>
          {item.shortLabel}
        </Text>
      </HStack>
      <Text font={15} fontWeight="semibold" foregroundStyle="#F5F5F7" lineLimit={1} minScaleFactor={0.8}>
        {item.price}
      </Text>
      <Text font={8} foregroundStyle={getTrendColor(direction)} lineLimit={1} minScaleFactor={0.75}>
        {getTrendSymbol(direction)} {formatForecastPrice(forecastPrice)}
      </Text>
    </VStack>
  </ZStack>
)

/**
 * 油价项目组件
 * @param props 组件属性
 * @param props.type 油品类型
 * @param props.price 当前价格
 * @param props.forecastPrice 预测价格
 * @param props.priceDirection 价格趋势
 */
const GasPriceItem = ({
  label,
  price,
  forecastPrice,
  priceDirection,
  forecastFontSize,
  labelFontSize,
  priceFontSize
}: {
  label: string
  price: string
  forecastPrice?: string
  forecastFontSize: number
  labelFontSize: number
  priceDirection?: 'rising' | 'falling' | 'stranded'
  priceFontSize: number
}) => {
  // 获取动态字体颜色
  const textColor = getDynamicTextColor()

  return (
    <HStack alignment="center" spacing={8}>
      <Text font={labelFontSize} fontWeight="bold" foregroundStyle="#EB604D" lineLimit={1} minScaleFactor={0.8}>
        {label}
      </Text>
      <Spacer />
      <Text font={priceFontSize} foregroundStyle={textColor} lineLimit={1} minScaleFactor={0.8}>
        {price}
      </Text>
      {forecastPrice && priceDirection ? (
        <Text font={forecastFontSize} foregroundStyle={getTrendColor(priceDirection)} lineLimit={1} minScaleFactor={0.75}>
          {getTrendSymbol(priceDirection)} {formatForecastPrice(forecastPrice)}
        </Text>
      ) : null}
    </HStack>
  )
}

const getTrendText = (direction: string): string => {
  switch (direction) {
    case 'rising':
      return '上涨'
    case 'falling':
      return '下跌'
    case 'stranded':
      return '搁浅'
    default:
      return '搁浅'
  }
}

const getLargeWidgetLayout = (itemCount: number) => {
  if (itemCount >= 7) {
    return {
      footerFontSize: 11,
      forecastFontSize: 12,
      labelFontSize: 26,
      priceFontSize: 21,
      rowSpacing: 5,
      sectionSpacing: 8,
      verticalPadding: 14
    }
  }

  if (itemCount >= 6) {
    return {
      footerFontSize: 11,
      forecastFontSize: 13,
      labelFontSize: 28,
      priceFontSize: 22,
      rowSpacing: 7,
      sectionSpacing: 9,
      verticalPadding: 15
    }
  }

  if (itemCount >= 5) {
    return {
      footerFontSize: 11,
      forecastFontSize: 14,
      labelFontSize: 30,
      priceFontSize: 23,
      rowSpacing: 9,
      sectionSpacing: 10,
      verticalPadding: 16
    }
  }

  return {
    footerFontSize: 12,
    forecastFontSize: 15,
    labelFontSize: 32,
    priceFontSize: 24,
    rowSpacing: 12,
    sectionSpacing: 12,
    verticalPadding: 16
  }
}

/**
 * 加载数据的异步函数
 * @returns 完整油价数据Promise
 */
const loadOilData = async (): Promise<CompleteOilData> => {
  if (!oilData) {
    try {
      oilData = await getCompleteOilData()
    } catch (error) {
      console.error('加载油价数据失败:', error)
      // 返回默认数据
      oilData = {
        startDate: '数据加载失败',
        region: '未知地区',
        areaZoneName: '',
        lastUpdated: new Date().toLocaleString(),
        prices: [],
        availableOilTypes: [],
        priceDirection: 'stranded',
        forecastDate: '未知',
        forecastPrice: '0.00'
      }
    }
  }
  return oilData
}

/**
 * Widget视图 - 根据不同尺寸显示不同布局
 * @param props 组件属性
 * @param props.data 完整油价数据
 */
const WidgetView = ({ data }: { data: CompleteOilData }) => {
  // 获取动态字体颜色和背景图片设置
  const textColor = getDynamicTextColor()
  const oilSettings = getCurrentSettings()
  const title = data.areaZoneName ? `${data.region}${data.areaZoneName}油价` : `${data.region}油价`

  const widgetBackground = generateWidgetBackground(oilSettings)

  switch (Widget.family) {
    case 'systemSmall': {
      const selectedItem = getSmallWidgetOilPriceItem(data)

      return (
        <VStack spacing={6} padding={16} alignment="center" widgetBackground={widgetBackground}>
          <Image systemName="fuelpump.fill" font="title2" foregroundStyle="systemOrange" />
          <Spacer />
          <Text font="title" fontWeight="bold" foregroundStyle={textColor}>
            {selectedItem?.price || '未开放'}
          </Text>
          <Text font="caption" foregroundStyle="#EB604D">
            {selectedItem?.label || '油价'}
          </Text>
          <Spacer />
          <Text font="caption2" foregroundStyle={textColor}>
            {data.lastUpdated}
          </Text>
        </VStack>
      )
    }

    case 'systemMedium': {
      const mediumOilPriceItems = getMediumWidgetOilPriceItems(data)
      const size = Widget.displaySize
      const horizontalPadding = 12
      const cardSpacing = 6
      const cardWidth = Math.max(
        58,
        (size.width - horizontalPadding * 2 - cardSpacing * 3) / 4,
      )

      return (
        <ZStack
          frame={size}
          alignment="topLeading"
          widgetBackground="#1C1C1E"
        >
          <DashboardDecoration
            width={size.width}
            height={size.height}
            direction={data.priceDirection}
          />

          <VStack
            spacing={3}
            padding={{ horizontal: horizontalPadding, vertical: 8 }}
            frame={size}
            alignment="leading"
          >
            <HStack spacing={7} alignment="center" frame={{ width: size.width - horizontalPadding * 2 }}>
              <ZStack frame={{ width: 25, height: 25 }} alignment="center">
                <Circle fill="rgba(255,159,10,0.16)" frame={{ width: 25, height: 25 }} />
                <Image systemName="fuelpump.fill" font={13} foregroundStyle="#FF9F0A" />
              </ZStack>
              <VStack spacing={0} alignment="leading">
                <Text font={14} fontWeight="bold" foregroundStyle="#F5F5F7" lineLimit={1}>
                  {title}
                </Text>
                <Text font={8} foregroundStyle="rgba(245,245,247,0.56)">
                  今日参考价 · 元/升
                </Text>
              </VStack>
              <Spacer />
            </HStack>

            <Spacer />

            <HStack spacing={cardSpacing} frame={{ width: size.width - horizontalPadding * 2 }}>
              {mediumOilPriceItems.map(item => (
                <MediumOilCard
                  key={item.type}
                  item={item}
                  direction={data.priceDirection}
                  forecastPrice={data.forecastPrice}
                  width={cardWidth}
                />
              ))}
            </HStack>

            <Spacer />

            <ZStack frame={{ width: size.width - horizontalPadding * 2, height: 25 }} alignment="center">
              <RoundedRectangle
                cornerRadius={8}
                fill="rgba(0,0,0,0.20)"
                stroke={{ shapeStyle: 'rgba(255,255,255,0.05)', strokeStyle: { lineWidth: 0.6 } }}
                frame={{ width: size.width - horizontalPadding * 2, height: 25 }}
              />
              <HStack
                spacing={5}
                alignment="center"
                padding={{ horizontal: 8 }}
                frame={{ width: size.width - horizontalPadding * 2 }}
              >
                <Image systemName="clock.arrow.circlepath" font={8} foregroundStyle="#FF9F0A" />
                <Text font={8} foregroundStyle="rgba(245,245,247,0.62)" lineLimit={1} minScaleFactor={0.75}>
                  {data.lastUpdated}刷新
                </Text>
                <Spacer />
                <Text font={8} foregroundStyle="rgba(245,245,247,0.62)" lineLimit={1} minScaleFactor={0.75}>
                  {data.forecastDate + getTrendText(data.priceDirection)}调整
                </Text>
              </HStack>
            </ZStack>
          </VStack>
        </ZStack>
      )
    }

    case 'systemLarge':
    case 'systemExtraLarge': {
      const layout = getLargeWidgetLayout(data.prices.length)

      return (
        <VStack spacing={layout.sectionSpacing} padding={{ horizontal: 16, vertical: layout.verticalPadding }} widgetBackground={widgetBackground}>
          <HStack spacing={4} alignment="top">
            <Image systemName="fuelpump.fill" font="title3" foregroundStyle="systemOrange" />
            <Text font="title3" fontWeight="bold" foregroundStyle={textColor} lineLimit={1} minScaleFactor={0.8}>
              {title}
            </Text>
            <Spacer />
          </HStack>
          <Spacer />
          <VStack spacing={layout.rowSpacing} alignment="center">
            {data.prices.map(item => (
              <GasPriceItem
                key={item.type}
                label={item.shortLabel}
                price={item.price}
                forecastPrice={data.forecastPrice}
                forecastFontSize={layout.forecastFontSize}
                labelFontSize={layout.labelFontSize}
                priceDirection={data.priceDirection}
                priceFontSize={layout.priceFontSize}
              />
            ))}
          </VStack>
          <Spacer />
          <HStack spacing={2} alignment="center">
            <Text font={layout.footerFontSize} foregroundStyle={textColor} lineLimit={1} minScaleFactor={0.8}>
              {data.lastUpdated}刷新
            </Text>
            <Text font={layout.footerFontSize} foregroundStyle={textColor}>
              •
            </Text>
            <Text font={layout.footerFontSize} foregroundStyle={textColor} lineLimit={1} minScaleFactor={0.8}>
              {data.forecastDate + getTrendText(data.priceDirection)}调整
            </Text>
          </HStack>
        </VStack>
      )
    }

    default:
      return (
        <VStack spacing={8} alignment="center">
          <Image systemName="fuelpump.fill" font="title" foregroundStyle="systemOrange" />
          <Text font="body" foregroundStyle={textColor}>
            油价小组件
          </Text>
          <Text font="caption" foregroundStyle={textColor}>
            {data.region}
          </Text>
        </VStack>
      )
  }
}

/**
 * 主函数 - 异步加载数据并呈现Widget
 */
const main = async (): Promise<void> => {
  try {
    const data = await loadOilData()
    Widget.present(<WidgetView data={data} />)
  } catch (error) {
    console.error('Widget加载失败:', error)

    // 获取动态字体颜色和背景图片设置用于错误显示
    const errorTextColor = getDynamicTextColor()

    // 显示错误信息
    Widget.present(
      <VStack spacing={8} alignment="center" padding={16}>
        <Image systemName="exclamationmark.triangle.fill" font="title" foregroundStyle="systemRed" />
        <Text font="body" foregroundStyle={errorTextColor}>
          数据加载失败
        </Text>
        <Text font="caption" foregroundStyle={errorTextColor}>
          请检查网络连接
        </Text>
      </VStack>
    )
  }
}

// 执行主函数
main()
