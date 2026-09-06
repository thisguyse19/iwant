import type { GlassConfig } from '@ybouane/liquidglass'

/**
 * Apple-style liquid glass — sharp refracted background, edge lensing.
 * Glassiness comes from refraction + edge highlight, not heavy blur/tint.
 */
export const TAB_PILL_GLASS: Partial<GlassConfig> = {
  blurAmount: 0.12,
  refraction: 0.8,
  chromAberration: 0.09,
  edgeHighlight: 0.2,
  specular: 0.05,
  fresnel: 0.94,
  distortion: 0.021,
  cornerRadius: 31,
  zRadius: 28,
  opacity: 1,
  saturation: 0.08,
  tintStrength: 0,
  brightness: -0.04,
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
  specular: 0.08,
  refraction: 0.76,
}

export const ADD_MENU_GLASS: Partial<GlassConfig> = {
  ...TAB_PILL_GLASS,
  cornerRadius: 22,
  zRadius: 22,
  blurAmount: 0.14,
  refraction: 0.72,
  shadowSpread: 16,
}

/** Keep glass panels sized by CSS — clear any stale inline dimensions. */
export function pinGlassDimensions(el: HTMLElement) {
  el.style.removeProperty('width')
  el.style.removeProperty('height')
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
