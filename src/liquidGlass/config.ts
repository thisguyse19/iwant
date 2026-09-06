import type { GlassConfig } from '@ybouane/liquidglass'

/** Apple regular-material tab bar pill — biconvex lens with edge refraction */
export const TAB_PILL_GLASS: Partial<GlassConfig> = {
  blurAmount: 0.38,
  refraction: 0.52,
  chromAberration: 0.04,
  edgeHighlight: 0.12,
  specular: 0.16,
  fresnel: 0.85,
  distortion: 0.015,
  cornerRadius: 29,
  zRadius: 22,
  opacity: 1,
  saturation: 0.08,
  tintStrength: 0.1,
  brightness: -0.1,
  shadowOpacity: 0.22,
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
  zRadius: 20,
  button: true,
  specular: 0.22,
  refraction: 0.48,
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
