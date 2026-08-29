import { Widget, Text } from "scripting";
import { api } from "./util/api";

import { View as MediumView } from "./widget/medium";

(async () => {
  const { data } = await api.fetchData();

  switch (Widget.family) {
    case "systemMedium":
      Widget.present(<MediumView data={selectSource(data)} />);
      break;
    default:
      throw new Error("Unsupported widget size");
  }
})().catch((e) => {
  Widget.present(<Text>{String(e)}</Text>);
});

function selectSource(data: any) {
  if (api.setting.length === 0) return data[0];

  const KEY = "current";
  const index: number = Storage.get(KEY) || 0;
  const newIndex = (index + 1) % api.setting.length;
  Storage.set(KEY, newIndex);

  return (
    data.find((item: any) => item.lotteryName === api.setting[newIndex]) ||
    data[0]
  );
}
