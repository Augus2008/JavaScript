import {
  Capsule,
  Circle,
  HStack,
  Image,
  Link,
  Rectangle,
  Spacer,
  Text,
  VStack,
  Widget,
  ZStack,
} from "scripting";
import { ReloadButton } from "./comp/reloadButton";
import { formatRMB } from "../util/format";

const RED_BALL = {
  gradient: [
    { color: "#FF7474", location: 0.00 },
    { color: "#E5485F", location: 0.48 },
    { color: "#A92C48", location: 1.00 },
  ],
  startPoint: { x: 0.20, y: 0.10 },
  endPoint: { x: 0.82, y: 0.92 },
};

const BLUE_BALL = {
  gradient: [
    { color: "#6DB9FF", location: 0.00 },
    { color: "#3478D4", location: 0.52 },
    { color: "#214A9A", location: 1.00 },
  ],
  startPoint: { x: 0.20, y: 0.10 },
  endPoint: { x: 0.82, y: 0.92 },
};

const GOLD_BALL = {
  gradient: [
    { color: "#FFC96B", location: 0.00 },
    { color: "#F08A3C", location: 0.54 },
    { color: "#B44B31", location: 1.00 },
  ],
  startPoint: { x: 0.20, y: 0.10 },
  endPoint: { x: 0.82, y: 0.92 },
};

const TICKET_BACKGROUND = {
  gradient: [
    { color: "#272A35", location: 0.00 },
    { color: "#211C29", location: 0.44 },
    { color: "#281820", location: 0.72 },
    { color: "#151C2B", location: 1.00 },
  ],
  startPoint: { x: 0, y: 0.35 },
  endPoint: { x: 1, y: 0.65 },
};

function LotteryBackground({ width, height }: { width: number; height: number }) {
  const glowSize = Math.min(148, height * 0.94);
  return (
    <ZStack frame={{ width, height }} alignment="topLeading">
      <Rectangle fill="#1C1C1E" frame={{ width, height }} />
      <Rectangle fill={TICKET_BACKGROUND} frame={{ width, height }} />
      <Circle
        fill={{
          gradient: [
            { color: "rgba(255,72,96,0.18)", location: 0.00 },
            { color: "rgba(193,45,79,0.055)", location: 0.55 },
            { color: "rgba(193,45,79,0.00)", location: 1.00 },
          ],
          center: { x: 0.5, y: 0.5 },
          startRadius: 0,
          endRadius: glowSize * 0.62,
        }}
        frame={{ width: glowSize * 1.30, height: glowSize * 1.30 }}
        position={{ x: width * 0.14, y: height * 0.20 }}
      />
      <Circle
        fill={{
          gradient: [
            { color: "rgba(64,130,255,0.18)", location: 0.00 },
            { color: "rgba(55,93,184,0.055)", location: 0.56 },
            { color: "rgba(55,93,184,0.00)", location: 1.00 },
          ],
          center: { x: 0.5, y: 0.5 },
          startRadius: 0,
          endRadius: glowSize * 0.66,
        }}
        frame={{ width: glowSize * 1.42, height: glowSize * 1.42 }}
        position={{ x: width * 0.91, y: height * 0.72 }}
      />
      {/* 红蓝错位叠影的大号“奖”字，作为右侧票券艺术水印。 */}
      <Text
        font={92}
        fontWeight="bold"
        foregroundStyle="rgba(70,126,255,0.075)"
        rotationEffect={-9}
        position={{ x: width * 0.84 + 4, y: height * 0.53 + 3 }}
      >
        奖
      </Text>
      <Text
        font={92}
        fontWeight="bold"
        foregroundStyle="rgba(255,74,102,0.075)"
        rotationEffect={-9}
        position={{ x: width * 0.84 - 3, y: height * 0.53 - 2 }}
      >
        奖
      </Text>
      <Text
        font={88}
        fontWeight="bold"
        foregroundStyle={{
          gradient: [
            { color: "rgba(255,102,121,0.13)", location: 0.00 },
            { color: "rgba(181,75,132,0.105)", location: 0.50 },
            { color: "rgba(87,143,255,0.12)", location: 1.00 },
          ],
          startPoint: { x: 0.12, y: 0.12 },
          endPoint: { x: 0.88, y: 0.88 },
        }}
        rotationEffect={-9}
        position={{ x: width * 0.84, y: height * 0.53 }}
      >
        奖
      </Text>
      <Rectangle
        fill={{
          gradient: [
            { color: "rgba(8,9,13,0.22)", location: 0.00 },
            { color: "rgba(28,28,30,0.00)", location: 0.28 },
            { color: "rgba(28,28,30,0.00)", location: 0.72 },
            { color: "rgba(7,8,11,0.28)", location: 1.00 },
          ],
          startPoint: { x: 0.5, y: 0 },
          endPoint: { x: 0.5, y: 1 },
        }}
        frame={{ width, height }}
      />
    </ZStack>
  );
}

function NumberBall({
  value,
  size,
  kind,
  compact = false,
}: {
  value: string;
  size: number;
  kind: "red" | "blue" | "gold";
  compact?: boolean;
}) {
  const fill = kind === "blue" ? BLUE_BALL : kind === "gold" ? GOLD_BALL : RED_BALL;

  return (
    <ZStack frame={{ width: size, height: size }} alignment="center">
      <Circle
        fill={fill}
        stroke={{
          shapeStyle: "rgba(255,255,255,0.20)",
          strokeStyle: { lineWidth: 0.7 },
        }}
        frame={{ width: size, height: size }}
      />
      <Circle
        fill="rgba(255,255,255,0.32)"
        frame={{ width: compact ? 3 : 4, height: compact ? 3 : 4 }}
        position={{ x: size * 0.34, y: size * 0.28 }}
      />
      <Text
        font={compact ? 9 : 12}
        fontWeight="bold"
        fontWidth="compressed"
        foregroundStyle="#FFFFFF"
      >
        {value}
      </Text>
    </ZStack>
  );
}

function NumberStage({ data, width }: { data: any; width: number }) {
  const first = String(data.firstNumbers || "").split(",").filter(Boolean);
  const last = String(data.lastNumbers || "").split(",").filter(Boolean);
  const isLong = data.lotteryType === "kl8" || first.length > 10;
  const isDigit = ["pl3", "pl5", "fc3d"].includes(data.lotteryType);
  const firstKind: "red" | "gold" = isDigit ? "gold" : "red";
  const ballSize = isLong ? 19 : first.length + last.length >= 7 ? 27 : 31;
  const stageHeight = isLong ? 68 : 61;
  const innerWidth = width - 12;
  const totalBallCount = first.length + last.length;
  const singleWidth = totalBallCount <= 3
    ? innerWidth * 0.62
    : totalBallCount <= 5
      ? innerWidth * 0.82
      : innerWidth;

  const spreadRow = (
    values: string[],
    kind: "red" | "blue" | "gold",
    compact: boolean,
    rowWidth: number,
  ) => {
    const gap = values.length > 1
      ? Math.max(3, (rowWidth - values.length * ballSize) / (values.length - 1))
      : 0;
    return (
      <HStack spacing={gap} alignment="center" frame={{ width: rowWidth }}>
        {values.map((value, index) => (
          <NumberBall
            key={`${kind}-${index}-${value}`}
            value={value}
            size={ballSize}
            kind={kind}
            compact={compact}
          />
        ))}
      </HStack>
    );
  };

  const singleItemCount = totalBallCount + (last.length ? 1 : 0);
  const singleContentWidth = totalBallCount * ballSize + (last.length ? 1 : 0);
  const singleGap = singleItemCount > 1
    ? Math.max(4, (singleWidth - singleContentWidth) / (singleItemCount - 1))
    : 0;

  return (
    <ZStack frame={{ width, height: stageHeight }} alignment="center">
      {isLong ? (
        <VStack spacing={6} alignment="center" frame={{ width: innerWidth }}>
          {spreadRow(first.slice(0, 10), "red", true, innerWidth)}
          {spreadRow(first.slice(10, 20), "red", true, innerWidth)}
        </VStack>
      ) : (
        <HStack spacing={singleGap} alignment="center" frame={{ width: singleWidth }}>
          {first.map((value, index) => (
            <NumberBall
              key={`first-${index}-${value}`}
              value={value}
              size={ballSize}
              kind={firstKind}
            />
          ))}
          {last.length ? (
            <Capsule
              fill="rgba(255,255,255,0.16)"
              frame={{ width: 1, height: ballSize * 0.68 }}
            />
          ) : null}
          {last.map((value, index) => (
            <NumberBall
              key={`last-${index}-${value}`}
              value={value}
              size={ballSize}
              kind="blue"
            />
          ))}
        </HStack>
      )}
    </ZStack>
  );
}

export function View({ data }: { data: any }) {
  const size = Widget.displaySize;
  const contentWidth = size.width - 24;
  const issue = String(data.issue || "");
  const time = String(data.openTime || "").slice(5, 16);

  return (
    <Link url={data.openUrl} buttonStyle="plain">
      <ZStack frame={size} alignment="topLeading" widgetBackground="#1C1C1E">
        <LotteryBackground width={size.width} height={size.height} />
        <VStack
          spacing={4}
          padding={{ horizontal: 12, vertical: 8 }}
          frame={size}
          alignment="leading"
        >
          <HStack spacing={7} alignment="center" frame={{ width: contentWidth }}>
            <ZStack frame={{ width: 25, height: 25 }} alignment="center">
              <Circle fill="rgba(255,83,105,0.15)" frame={{ width: 25, height: 25 }} />
              <Image systemName="ticket.fill" font={12} foregroundStyle="#FF6679" />
            </ZStack>
            <VStack spacing={0} alignment="leading">
              <Text font={14} fontWeight="bold" foregroundStyle="#F5F5F7">
                {data.lotteryName}
              </Text>
              <Text font={8} foregroundStyle="rgba(245,245,247,0.54)">
                第 {issue.slice(4)} 期 · {data.frequency}
              </Text>
            </VStack>
            <Spacer />
            <ReloadButton />
          </HStack>

          <Spacer />
          <NumberStage data={data} width={contentWidth} />
          <Spacer />

          <HStack
            spacing={5}
            padding={{ horizontal: 8 }}
            frame={{ width: contentWidth, height: 24 }}
          >
            <Image systemName="sparkles" font={8} foregroundStyle="#FF6679" />
            <Text font={8} foregroundStyle="rgba(245,245,247,0.64)">
              奖池 {formatRMB(data.poolAmount) || "暂无"}
            </Text>
            <Spacer />
            <Image systemName="clock" font={8} foregroundStyle="#69A5FF" />
            <Text font={8} foregroundStyle="rgba(245,245,247,0.64)">
              {time} 开奖
            </Text>
          </HStack>
        </VStack>
      </ZStack>
    </Link>
  );
}
