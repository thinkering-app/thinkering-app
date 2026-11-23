import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'

import { InterestSelectionProvider } from '@/interests/selection'
import { colors, fonts } from '@/theme/tokens'

export default function TabsLayout() {
  const { t } = useTranslation()
  return (
    <InterestSelectionProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.cornflower.DEFAULT,
          tabBarInactiveTintColor: colors.ink.soft,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.hairline,
            // The browser has no bottom inset to lend the bar room, and at the
            // default height the label below the icon is cut off.
            ...(Platform.OS === 'web' ? { height: 60 } : null),
          },
          tabBarLabelStyle: {
            fontFamily: fonts.sansMedium,
            fontSize: 12,
          },
        }}
      >
        <Tabs.Screen
          name="today"
          options={{
            title: t('common.tabs.today'),
            tabBarButtonTestID: 'tab-today',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sunny-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="path"
          options={{
            title: t('common.tabs.path'),
            tabBarButtonTestID: 'tab-path',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t('common.tabs.history'),
            tabBarButtonTestID: 'tab-history',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="me"
          options={{
            title: t('common.tabs.me'),
            tabBarButtonTestID: 'tab-me',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </InterestSelectionProvider>
  )
}
