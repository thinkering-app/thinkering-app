interface ColorScale {
  DEFAULT: string
  [variant: string]: string
}

interface ThinkeringPreset {
  theme: {
    extend: {
      colors: {
        paper: string
        surface: string
        hairline: string
        ink: ColorScale
        cornflower: ColorScale
        leaf: ColorScale
        sun: ColorScale
        peach: ColorScale
      }
      fontFamily: Record<string, string[]>
      fontSize: Record<string, [string, { lineHeight: string }]>
      borderRadius: Record<string, string>
      boxShadow: Record<string, string>
    }
  }
}

declare const preset: ThinkeringPreset
export = preset
