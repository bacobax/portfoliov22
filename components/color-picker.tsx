"use client"

import { useEffect, useId, useRef, useState, type CSSProperties } from "react"
import { Check, Palette, X } from "lucide-react"

interface ColorPickerProps {
  onColorChange: (h: number, s: number, l: number) => void
  defaultH?: number
  defaultS?: number
  defaultL?: number
  canPersist?: boolean
  onPersistDefault?: (color: { h: number; s: number; l: number }) => void
}

type ThemeColor = { h: number; s: number; l: number }

const PRESETS: ThemeColor[] = [
  { h: 180, s: 97, l: 74 },
  { h: 65, s: 88, l: 67 },
  { h: 263, s: 86, l: 75 },
  { h: 335, s: 87, l: 67 },
  { h: 28, s: 92, l: 64 },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(value), min), max)
}

function hslToHex({ h, s, l }: ThemeColor) {
  const saturation = s / 100
  const lightness = l / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
  const match = lightness - chroma / 2
  const [red, green, blue] =
    h < 60 ? [chroma, x, 0] :
      h < 120 ? [x, chroma, 0] :
        h < 180 ? [0, chroma, x] :
          h < 240 ? [0, x, chroma] :
            h < 300 ? [x, 0, chroma] : [chroma, 0, x]

  return `#${[red, green, blue]
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase()
}

export function ColorPicker({
  onColorChange,
  defaultH = 25,
  defaultS = 90,
  defaultL = 68,
  canPersist = false,
  onPersistDefault,
}: ColorPickerProps) {
  const [color, setColor] = useState<ThemeColor>({
    h: clamp(defaultH, 0, 360),
    s: clamp(defaultS, 0, 100),
    l: clamp(defaultL, 20, 90),
  })
  const [isOpen, setIsOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelId = useId()

  useEffect(() => {
    setColor({
      h: clamp(defaultH, 0, 360),
      s: clamp(defaultS, 0, 100),
      l: clamp(defaultL, 20, 90),
    })
  }, [defaultH, defaultS, defaultL])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && !pickerRef.current?.contains(target)) setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      setIsOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const updateColor = (nextColor: ThemeColor) => {
    const normalized = {
      h: clamp(nextColor.h, 0, 360),
      s: clamp(nextColor.s, 0, 100),
      l: clamp(nextColor.l, 20, 90),
    }
    setColor(normalized)
    onColorChange(normalized.h, normalized.s, normalized.l)
  }

  const colorValue = `hsl(${color.h} ${color.s}% ${color.l}%)`
  const pickerStyle = { "--picker-accent": colorValue } as CSSProperties

  return (
    <div ref={pickerRef} className="color-picker" style={pickerStyle}>
      <button
        ref={triggerRef}
        type="button"
        className="color-picker-trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Choose accent color"
        aria-expanded={isOpen}
        aria-controls={panelId}
        title="Choose accent color"
      >
        <span className="color-picker-trigger-icon" aria-hidden="true">
          <Palette />
          <i />
        </span>
        <span>Color</span>
      </button>

      {isOpen && (
        <div id={panelId} className="color-picker-panel" role="dialog" aria-label="Accent color picker">
          <div className="color-picker-heading">
            <div>
              <span className="mono">Interface / Accent</span>
              <h2>Set the signal.</h2>
            </div>
            <button
              type="button"
              className="color-picker-close"
              onClick={() => {
                setIsOpen(false)
                triggerRef.current?.focus()
              }}
              aria-label="Close color picker"
            >
              <X />
            </button>
          </div>

          <div className="color-picker-readout" aria-live="polite">
            <span className="color-picker-sample" aria-hidden="true" />
            <div>
              <strong>{hslToHex(color)}</strong>
              <span>HSL {color.h} / {color.s} / {color.l}</span>
            </div>
          </div>

          <div className="color-picker-controls">
            <label className="color-picker-control">
              <span><b>Hue</b><output>{color.h}°</output></span>
              <input
                className="color-range color-range-hue"
                type="range"
                aria-label="Hue"
                min="0"
                max="360"
                step="1"
                value={color.h}
                onInput={(event) => updateColor({ ...color, h: Number(event.currentTarget.value) })}
              />
            </label>

            <label className="color-picker-control">
              <span><b>Saturation</b><output>{color.s}%</output></span>
              <input
                className="color-range color-range-saturation"
                style={{
                  background: `linear-gradient(90deg, hsl(${color.h} 0% ${color.l}%), hsl(${color.h} 100% ${color.l}%))`,
                }}
                type="range"
                aria-label="Saturation"
                min="0"
                max="100"
                step="1"
                value={color.s}
                onInput={(event) => updateColor({ ...color, s: Number(event.currentTarget.value) })}
              />
            </label>

            <label className="color-picker-control">
              <span><b>Lightness</b><output>{color.l}%</output></span>
              <input
                className="color-range color-range-lightness"
                style={{
                  background: `linear-gradient(90deg, hsl(${color.h} ${color.s}% 10%), hsl(${color.h} ${color.s}% 50%), hsl(${color.h} ${color.s}% 90%))`,
                }}
                type="range"
                aria-label="Lightness"
                min="20"
                max="90"
                step="1"
                value={color.l}
                onInput={(event) => updateColor({ ...color, l: Number(event.currentTarget.value) })}
              />
            </label>
          </div>

          <div className="color-picker-presets">
            <span className="mono">Quick signals</span>
            <div>
              {PRESETS.map((preset) => {
                const isSelected = preset.h === color.h && preset.s === color.s && preset.l === color.l
                return (
                  <button
                    key={`${preset.h}-${preset.s}-${preset.l}`}
                    type="button"
                    className={isSelected ? "selected" : undefined}
                    style={{ backgroundColor: `hsl(${preset.h} ${preset.s}% ${preset.l}%)` }}
                    onClick={() => updateColor(preset)}
                    aria-label={`Use ${hslToHex(preset)} accent`}
                    aria-pressed={isSelected}
                  >
                    {isSelected && <Check />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="color-picker-footer">
            <p>{canPersist ? "Changes preview instantly." : "Preview lasts for this visit."}</p>
            {canPersist && onPersistDefault && (
              <button
                type="button"
                className="color-picker-save"
                onClick={() => {
                  onPersistDefault(color)
                  setIsOpen(false)
                }}
              >
                Save accent <span aria-hidden="true">↗</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
