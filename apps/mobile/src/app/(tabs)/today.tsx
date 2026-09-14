import { Text } from 'react-native'

import { Card } from '@/components/card'
import { Screen } from '@/components/screen'

export default function TodayScreen() {
  return (
    <Screen title="Today">
      <Card>
        <Text className="font-sans text-body text-ink-soft">Your activities will appear here.</Text>
      </Card>
    </Screen>
  )
}
