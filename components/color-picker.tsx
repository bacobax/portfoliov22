"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Palette } from "lucide-react"

interface ColorPickerProps {
  onColorChange: (h: number, s: number, l: number) => void
  defaultH?: number
  defaultS?: number
  defaultL?: number
}

export function ColorPicker({ onColorChange, defaultH = 25, defaultS = 90, defaultL = 68 }: ColorPickerProps) {
  const [hue, setHue] = useState(defaultH)
  const [saturation, setSaturation] = useState(defaultS)
  const [lightness, setLightness] = useState(defaultL)
  const [isOpen, setIsOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setHue(defaultH)
    setSaturation(defaultS)
    setLightness(defaultL)
  }, [defaultH, defaultS, defaultL])

  const handleHueChange = (value: number[]) => {
    setHue(value[0])
    onColorChange(value[0], saturation, lightness)
  }

  const handleSaturationChange = (value: number[]) => {
    setSaturation(value[0])
    onColorChange(hue, value[0], lightness)
  }

  const handleLightnessChange = (value: number[]) => {
    setLightness(value[0])
    onColorChange(hue, saturation, value[0])
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!pickerRef.current || (target && pickerRef.current.contains(target))) {
        return
      }

      setIsOpen(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={pickerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 border border-primary/50 bg-card hover:border-primary transition-colors"
        title="Color Picker"
      >
        <Palette className="w-5 h-5 text-primary" />
      </button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-72 p-4 bg-card border-primary/50 z-50 shadow-lg">
          <h4 className="text-sm font-mono text-primary mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            ACCENT_COLOR
          </h4>

          <div className="space-y-4">
            {/* Hue Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="text-muted-foreground">HUE</span>
                <span className="text-primary">{hue}°</span>
              </div>
              <Slider value={[hue]} onValueChange={handleHueChange} min={0} max={360} step={1} className="w-full" />
              <div
                className="h-2 mt-2 rounded"
                style={{
                  background:
                    "linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))",
                }}
              />
            </div>

            {/* Saturation Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="text-muted-foreground">SATURATION</span>
                <span className="text-primary">{saturation}%</span>
              </div>
              <Slider
                value={[saturation]}
                onValueChange={handleSaturationChange}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
              <div
                className="h-2 mt-2 rounded"
                style={{
                  background: `linear-gradient(to right, hsl(${hue}, 0%, ${lightness}%), hsl(${hue}, 100%, ${lightness}%))`,
                }}
              />
            </div>

            {/* Lightness Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="text-muted-foreground">LIGHTNESS</span>
                <span className="text-primary">{lightness}%</span>
              </div>
              <Slider
                value={[lightness]}
                onValueChange={handleLightnessChange}
                min={30}
                max={90}
                step={1}
                className="w-full"
              />
              <div
                className="h-2 mt-2 rounded"
                style={{
                  background: `linear-gradient(to right, hsl(${hue}, ${saturation}%, 0%), hsl(${hue}, ${saturation}%, 50%), hsl(${hue}, ${saturation}%, 100%))`,
                }}
              />
            </div>

            {/* Color Preview */}
            <div className="mt-4 p-3 border border-primary/30 bg-secondary/50">
              <p className="text-xs font-mono text-muted-foreground mb-2">PREVIEW:</p>
              <div
                className="h-12 rounded border-2"
                style={{
                  backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                  borderColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                }}
              />
              <p className="text-xs font-mono text-primary mt-2">
                hsl({hue}, {saturation}%, {lightness}%)
              </p>
            </div>
          </div>
        </Card>
      )}

    </div>
  )
}
