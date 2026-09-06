import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchProductImages, readImageFromDevice } from '../productImages'
import './ProductImagePicker.css'

interface ProductImagePickerProps {
  title: string
  value?: string
  onChange: (url: string | undefined) => void
}

export function ProductImagePicker({ title, value, onChange }: ProductImagePickerProps) {
  const [page, setPage] = useState(0)
  const [images, setImages] = useState<string[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const query = title.trim()

  const loadPage = useCallback(
    async (pageIndex: number) => {
      if (query.length < 2) {
        setImages([])
        setHasMore(false)
        return
      }
      setLoading(true)
      setError(null)
      const result = await fetchProductImages(query, pageIndex)
      setImages(result.images)
      setHasMore(result.hasMore)
      setLoading(false)
      if (result.images.length === 0 && pageIndex === 0) {
        setError('No pictures found. Try refresh or add your own.')
      }
    },
    [query],
  )

  useEffect(() => {
    setPage(0)
    void loadPage(0)
  }, [query, loadPage])

  const goPrev = () => {
    if (page <= 0 || loading) return
    const next = page - 1
    setPage(next)
    void loadPage(next)
  }

  const goNext = () => {
    if (!hasMore || loading) return
    const next = page + 1
    setPage(next)
    void loadPage(next)
  }

  const refresh = () => {
    if (loading) return
    const next = hasMore ? page + 1 : 0
    setPage(next)
    void loadPage(next)
  }

  const onPickFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const dataUrl = await readImageFromDevice(file)
      onChange(dataUrl)
      setError(null)
    } catch {
      setError('Could not use that image.')
    }
  }

  if (query.length < 2) {
    return (
      <div className="product-image-picker">
        <p className="product-image-hint">Add a name first to find pictures.</p>
        {value && (
          <div className="product-image-custom-preview">
            <img src={value} alt="" />
            <button type="button" className="product-image-clear" onClick={() => onChange(undefined)}>
              Remove
            </button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="product-image-file-input"
          onChange={(e) => {
            void onPickFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <button type="button" className="product-image-device-btn" onClick={() => fileRef.current?.click()}>
          Choose from device
        </button>
      </div>
    )
  }

  return (
    <div className="product-image-picker">
      <div className="product-image-header">
        <span className="product-image-label">Picture</span>
        <div className="product-image-nav">
          <button
            type="button"
            className="product-image-nav-btn"
            onClick={goPrev}
            disabled={page <= 0 || loading}
            aria-label="Previous pictures"
          >
            ‹
          </button>
          <button
            type="button"
            className="product-image-nav-btn"
            onClick={refresh}
            disabled={loading}
            aria-label="Load more pictures"
          >
            ↻
          </button>
          <button
            type="button"
            className="product-image-nav-btn"
            onClick={goNext}
            disabled={!hasMore || loading}
            aria-label="Next pictures"
          >
            ›
          </button>
        </div>
      </div>

      <div className={`product-image-grid ${loading ? 'loading' : ''}`}>
        {images.map((url) => (
          <button
            key={url}
            type="button"
            className={`product-image-option ${value === url ? 'selected' : ''}`}
            onClick={() => onChange(url)}
            aria-label="Select picture"
          >
            <img src={url} alt="" loading="lazy" />
          </button>
        ))}
        {loading &&
          Array.from({ length: Math.max(0, 4 - images.length) }).map((_, i) => (
            <div key={`sk-${i}`} className="product-image-skeleton" aria-hidden="true" />
          ))}
      </div>

      {error && !loading && <p className="product-image-error">{error}</p>}

      {value && !images.includes(value) && (
        <div className="product-image-custom-preview">
          <img src={value} alt="" />
          <span className="product-image-custom-tag">Your photo</span>
          <button type="button" className="product-image-clear" onClick={() => onChange(undefined)}>
            Remove
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="product-image-file-input"
        onChange={(e) => {
          void onPickFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <button type="button" className="product-image-device-btn" onClick={() => fileRef.current?.click()}>
        Choose from device
      </button>
    </div>
  )
}
