import type { GlassConfig } from '@ybouane/liquidglass'

/** Apple regular-material tab bar pill — biconvex lens with edge refraction */
export const TAB_PILL_GLASS: Partial<GlassConfig> = {
  blurAmount: 0.3,
  refraction: 0.8,
  chromAberration: 0.06,
  edgeHighlight: 0.1,
  specular: 0.42,
  fresnel: 1,
  distortion: 0.025,
  cornerRadius: 29,
  zRadius: 34,
  opacity: 1,
  saturation: 0.06,
  tintStrength: 0.03,
  brightness: -0.04,
  shadowOpacity: 0.26,
  shadowSpread: 16,
  shadowOffsetY: 3,
  floating: false,
  button: false,
  bevelMode: 0,
}

/** Circular + button — interactive glass with stronger specular */
export const TAB_ACTION_GLASS: Partial<GlassConfig> = {
  ...TAB_PILL_GLASS,
  cornerRadius: 29,
  zRadius: 30,
  button: true,
  specular: 0.48,
  refraction: 0.76,
}

/** Floating add menu panel */
export const ADD_MENU_GLASS: Partial<GlassConfig> = {
  ...TAB_PILL_GLASS,
  cornerRadius: 22,
  zRadius: 26,
  blurAmount: 0.34,
  refraction: 0.68,
  shadowSpread: 20,
}

export function setGlassConfig(el: HTMLElement, config: Partial<GlassConfig>) {
  el.dataset.config = JSON.stringify(config)
}
