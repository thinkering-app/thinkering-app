import { Platform, Switch, type SwitchProps } from 'react-native'

import { colors } from '@/theme/tokens'

// react-native-web colors the thumb of an *on* switch from its own
// `activeThumbColor` (a Material teal by default) and ignores `thumbColor`.
const webThumb: object = Platform.OS === 'web' ? { activeThumbColor: colors.surface } : {}

/** An on/off setting (docs/07): cornflower when on, an `outline` edge when off. */
export function Toggle(props: Omit<SwitchProps, 'trackColor' | 'thumbColor'>) {
  return (
    <Switch
      {...props}
      {...webThumb}
      trackColor={{ false: colors.outline, true: colors.cornflower.DEFAULT }}
      thumbColor={colors.surface}
    />
  )
}
