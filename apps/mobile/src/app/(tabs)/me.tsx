import { useState } from 'react'
import { View } from 'react-native'
import { localDateOf } from '@thinkering/core'
import { seedFixtureData } from '@thinkering/db'

import { Button } from '@/components/button'
import { Screen } from '@/components/screen'
import { db, repoContext } from '@/db'

export default function MeScreen() {
  const [seeded, setSeeded] = useState(false)

  return (
    <Screen title="Me">
      {__DEV__ ? (
        <View className="gap-3">
          <Button
            label={seeded ? 'Fixture data loaded' : 'Load fixture data'}
            onPress={() => {
              const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
              seedFixtureData(db, repoContext, { today: localDateOf(Date.now(), timeZone) })
              setSeeded(true)
            }}
          />
        </View>
      ) : null}
    </Screen>
  )
}
