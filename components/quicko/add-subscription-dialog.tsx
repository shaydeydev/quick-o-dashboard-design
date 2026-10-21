'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { addSubscription } from '@/lib/subscriptions-store'

const MAX_FILE_BYTES = 5 * 1024 * 1024

// Crop to a square and shrink to 96px so the logo stays tiny
async function makeLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Could not read that image. Try a PNG or JPEG.'))
      i.src = url
    })
    const size = 96
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not process the image.')
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const sx = (img.naturalWidth - side) / 2
    const sy = (img.naturalHeight - side) / 2
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

const inputClass =
  'w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

export function AddSubscriptionDialog({
  defaultDate,
  minDate,
  onClose,
}: {
  defaultDate: string
  minDate: string
  // message is set when a subscription was added
  onClose: (message?: string) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [renews, setRenews] = useState(defaultDate)
  const [logo, setLogo] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  // Escape closes. Tab stays inside the dialog.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const nodes = panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')
    if (!nodes || nodes.length === 0) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // lets you pick the same file again
    if (!file) return
    if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
      setError('Logo must be a PNG or JPEG image.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('That image is over 5 MB. Pick a smaller one.')
      return
    }
    setError('')
    setBusy(true)
    try {
      setLogo(await makeLogo(file))
    } catch (err: any) {
      setError(err.message || 'Could not read that image.')
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = addSubscription({
      name,
      price: parseFloat(price),
      renews,
      logo,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    onClose(`Added ${result.name} at the lowest priority.`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onKeyDown={onKeyDown}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-sub-title"
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#12141c] p-5 text-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="add-sub-title" className="text-base font-bold tracking-tight">
              Add a subscription
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">It joins the Guard at the lowest priority.</p>
          </div>
          <button
            type="button"
            onClick={() => onClose()}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-slate-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="sub-name" className="text-xs font-medium text-slate-200">
              Name
            </label>
            <input
              ref={nameRef}
              id="sub-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="Disney+"
              autoComplete="off"
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="sub-price" className="text-xs font-medium text-slate-200">
                Price per month ($)
              </label>
              <input
                id="sub-price"
                type="number"
                inputMode="decimal"
                min="0.01"
                max="999"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="9.99"
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="sub-date" className="text-xs font-medium text-slate-200">
                Next renewal
              </label>
              <input
                id="sub-date"
                type="date"
                min={minDate}
                value={renews}
                onChange={(e) => setRenews(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-200">Logo (optional)</span>
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-black/30">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="Logo preview" className="size-full object-cover" />
                ) : (
                  <ImagePlus className="size-5 text-slate-400" aria-hidden="true" />
                )}
              </span>
              <input
                id="sub-logo"
                type="file"
                accept="image/png,image/jpeg"
                onChange={onPickFile}
                className="peer sr-only"
              />
              <label
                htmlFor="sub-logo"
                className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/10 peer-focus-visible:ring-2 peer-focus-visible:ring-primary"
              >
                {logo ? 'Change image' : 'Upload PNG or JPEG'}
              </label>
              {logo && (
                <button
                  type="button"
                  onClick={() => setLogo(null)}
                  className="rounded-lg px-2 py-1.5 text-xs text-slate-300 underline hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400">No image? A colored letter icon is used.</p>
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}

          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => onClose()}
              className="flex-1 rounded-xl border border-white/20 px-3 py-2 text-xs text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
            >
              Add subscription
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}