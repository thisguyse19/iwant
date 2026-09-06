import type { GlassConfig } from '@ybouane/liquidglass'

/** Apple regular-material tab bar pill — biconvex lens with edge refraction */
export const TAB_PILL_GLASS: Partial<GlassConfig> = {
  blurAmount: 0.36,
  refraction: 0.48,
  chromAberration: 0.03,
  edgeHighlight: 0.1,
  specular: 0.1,
  fresnel: 0.82,
  distortion: 0.012,
  cornerRadius: 29,
  zRadius: 16,
  opacity: 1,
  saturation: 0.06,
  tintStrength: 0.08,
  brightness: -0.16,
  shadowOpacity: 0.2,
  shadowSpread: 10,
  shadowOffsetY: 2,
  floating: false,
  button: false,
  bevelMode: 0,
}

/** Circular + button — interactive glass with stronger specular */
export const TAB_ACTION_GLASS: Partial<GlassConfig> = {
  ...TAB_PILL_GLASS,
  cornerRadius: 29,
  zRadius: 16,
  button: true,
  specular: 0.14,
  refraction: 0.44,
}

/** Floating add menu panel */
export const ADD_MENU_GLASS: Partial<GlassConfig> = {
  ...TAB_PILL_GLASS,
  cornerRadius: 22,
  zRadius: 18,
  blurAmount: 0.4,
  refraction: 0.45,
  shadowSpread: 14,
}

export function setGlassConfig(el: HTMLElement, config: Partial<GlassConfig>) {
  const rect = el.getBoundingClientRect()
  const radius = Math.min(config.cornerRadius ?? 29, rect.height / 2, rect.width / 2)
  el.dataset.config = JSON.stringify({
    ...config,
    cornerRadius: Math.round(radius),
  })
}
