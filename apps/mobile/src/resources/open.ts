import { isWebUrl } from '@thinkering/core'
import { Linking } from 'react-native'

/**
 * Opens a saved or model-written resource link. The schemas already refuse
 * anything but http(s), but a stored row may predate them or come through
 * sync, so the check runs again where the tap happens.
 */
export function openResource(url: string): void {
  if (isWebUrl(url)) void Linking.openURL(url)
}
