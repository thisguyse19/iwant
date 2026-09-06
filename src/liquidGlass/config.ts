import type { GlassConfig } from '@ybouane/liquidglass'

/**
 * Apple-style liquid glass — sharp refracted background, edge lensing.
 * Avoid high blurAmount / tintStrength (reads as frosted plastic).
 */
export const TAB_PILL_GLASS: Partial<GlassConfig> = {
  blurAmount: 0.14,
  refraction: 0.74,
  chromAberration: 0.07,
  edgeHighlight: 0.16,
  specular: 0.2,
  fresnel: 0.92,
  distortion: 0.018,
  cornerRadius: 31,
  zRadius: 30,
  opacity: 1,
  saturation: 0.05,
  tintStrength: 0,
  brightness: -0.03,
  shadowOpacity: 0.26,
  shadowSpread: 14,
  shadowOffsetY: 3,
  floating: false,
  button: false,
  bevelMode: 0,
}

export const TAB_ACTION_GLASS: Partial<GlassConfig> = {
  ...TAB_PILL_GLASS,
  cornerRadius: 31,
  zRadius: 28,
  button: true,
  specular: 0.24,
  refraction: 0.7,
}

export const ADD_MENU_GLASS: Partial<GlassConfig> = {
  ...TAB_PILL_GLASS,
  cornerRadius: 22,
  zRadius: 22,
  blurAmount: 0.16,
  refraction: 0.68,
  shadowSpread: 16,
}

/** Lock layout box before WebGL reads offsetWidth/offsetHeight. */
export function pinGlassDimensions(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  if (rect.width > 0) el.style.width = `${Math.round(rect.width)}px`
  if (rect.height > 0) el.style.height = `${Math.round(rect.height)}px`
}

export function setGlassConfig(el: HTMLElement, config: Partial<GlassConfig>) {
  pinGlassDimensions(el)
  const height = el.offsetHeight
  const width = el.offsetWidth
  const maxRadius = Math.min(height / 2, width / 2)
  const radius = Math.min(config.cornerRadius ?? 31, maxRadius)
  el.dataset.config = JSON.stringify({
    ...config,
    cornerRadius: Math.max(1, Math.round(radius)),
  })
}
