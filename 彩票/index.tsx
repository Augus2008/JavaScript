import { Script, Navigation } from "scripting";
import { View } from "./page/setting";

(async () => {
  await Navigation.present({
    element: <View />,
  });
})()
  .catch(async (e) => {
    await new Promise((resolve) => {
      console.present().then(resolve);
      console.error(e);
    });
  })
  .finally(Script.exit);
