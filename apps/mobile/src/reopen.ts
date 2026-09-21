import { router, type Href } from 'expo-router'
import { Platform } from 'react-native'

/**
 * Leaves for `href` with nothing held over from the data that was there. On web
 * that is a full page load, which also drops every screen's in-memory state; on
 * native a reload would re-deliver the deep link that got us here, so it
 * navigates.
 */
export function reopenAt(href: Href & string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.replace(href)
    return
  }
  router.replace(href)
}
