import {
  Button,
  HStack,
  Image,
  List,
  Navigation,
  NavigationStack,
  ProgressView,
  Section,
  Spacer,
  Text,
  useEffect,
  useState,
} from "scripting";
import { api } from "../util/api";

export function View() {
  const dismiss = Navigation.useDismiss();
  return (
    <NavigationStack>
      <StackView
        navigationTitle={"设置"}
        toolbar={{
          topBarLeading: [
            <Button title={"退出"} systemImage={"xmark"} action={dismiss} />,
          ],
          topBarTrailing: [
            <Button
              title={"保存"}
              systemImage={"checkmark"}
              action={async () => {
                api.save();
                dismiss();
              }}
            />,
          ],
        }}
      />
    </NavigationStack>
  );
}

function StackView() {
  return (
    <List>
      <Section title={"彩票种类"}>
        <SelectView />
      </Section>
    </List>
  );
}

function SelectView() {
  const [data, SetData] = useState<any>(null);

  useEffect(() => {
    api.fetchData().then((r) => {
      // console.log(res);
      SetData(r);
    });
  }, []);

  if (data === null) return <ProgressView />;

  return (
    <>
      {data.data.map((i: any) => {
        return <ItemView title={i.lotteryName} />;
      })}
    </>
  );
}

function ItemView({ title }: { title: string }) {
  const [value, setValue] = useState<boolean>(api.setting.includes(title));
  return (
    <Button
      buttonStyle={"plain"}
      action={() => {
        if (value) {
          const index = api.setting.indexOf(title);
          if (index !== -1) {
            api.setting.splice(index, 1);
          }
        } else {
          if (!api.setting.includes(title)) {
            api.setting.push(title);
          }
        }
        setValue(!value);
      }}>
      <HStack contentShape={"rect"}>
        <Text>{title}</Text>
        <Spacer />
        {value ? (
          <Image
            foregroundStyle={"accentColor"}
            fontWeight={"medium"}
            systemName={"checkmark"}
          />
        ) : null}
      </HStack>
    </Button>
  );
}
