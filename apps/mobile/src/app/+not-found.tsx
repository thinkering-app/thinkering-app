import { Redirect } from 'expo-router'

/**
 * A path the app doesn't have — an old link, or a route from an earlier build
 * — goes home, where the index decides between Today and intake.
 */
export default function NotFound() {
  return <Redirect href="/" />
}
