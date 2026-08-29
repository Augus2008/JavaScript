import {
  Navigation, Script,
  NavigationStack, Button, List, Section, Text,
  useCallback, useEffect, useState,
  NavigationLink,
  Image
} from 'scripting'
import { fetchHotSearch, Weibo } from './apis/weibo'
import HotSearch from './components/HotSearch'
import Settings from './pages/Settings'
import Search from './pages/Search'

function View() {
  const dismiss = Navigation.useDismiss()
  const [searches, setSearches] = useState<Weibo.HotSearchItem[]>([])
  const [loading, setLoading] = useState(true)

  const setSearchesAsync = useCallback(async () => {
    setLoading(true)
    const data = await fetchHotSearch()
    setSearches(data)
    setLoading(false)
  }, [])

  // 构建搜索页 URL：直接使用 word，避免对 scheme 做脆弱的字符串切分
  const getItemURL = (item: Weibo.HotSearchItem) => {
    const word = item.word || item.title || ''
    return `https://m.weibo.cn/search?containerid=${encodeURIComponent('100103type=1&t=10&q=' + word)}`
  }

  useEffect(() => {
    setSearchesAsync()
  }, [])

  return (
    <NavigationStack>
      <List
        navigationTitle="微博"
        toolbar={{
          topBarTrailing: [
            <Button title='关闭' action={dismiss} />,
            <NavigationLink destination={<Settings />}>
              <Image systemName='gearshape.fill' />
            </NavigationLink>
          ]
        }}
        refreshable={setSearchesAsync}
      >
        {(searches ?? []).map((item) => (
          <NavigationLink
            key={item.itemid}
            destination={<Search url={getItemURL(item)} />}
          >
            <HotSearch data={item} />
          </NavigationLink>
        ))}

        {loading && (searches ?? []).length === 0 ? (
          <Section>
            <Text>加载中…</Text>
          </Section>
        ) : null}

        {!loading && (searches ?? []).length === 0 ? (
          <Section>
            <Text>暂无热搜数据</Text>
          </Section>
        ) : null}
      </List>
    </NavigationStack>
  )
}

const run = async () => {
  await Navigation.present({
    element: <View />,
    modalPresentationStyle: "fullScreen"
  })
  Script.exit()
}

run()
