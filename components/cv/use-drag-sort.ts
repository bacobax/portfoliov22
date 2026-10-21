import { useState, type DragEvent } from "react"

/** Final index of an item moved from `from` to the gap `slot` (0..length), as after `splice`. */
export function slotToIndex(from: number, slot: number) {
  return slot > from ? slot - 1 : slot
}

export function arrayMove<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list]
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * Vertical drag-to-sort for a list. Only the handle is draggable, so text inside
 * the items stays selectable. `slot` is the gap the item would drop into.
 */
export function useDragSort(onMove: (from: number, to: number) => void) {
  const [from, setFrom] = useState<number | null>(null)
  const [slot, setSlot] = useState<number | null>(null)

  const reset = () => { setFrom(null); setSlot(null) }

  return {
    dragIndex: from,
    /** Gap index where a drop indicator should show, or null. No-op gaps are hidden. */
    dropSlot: from !== null && slot !== null && slotToIndex(from, slot) !== from ? slot : null,
    handleProps: (index: number) => ({
      draggable: true as const,
      onDragStart: (event: DragEvent<HTMLElement>) => {
        const item = event.currentTarget.closest<HTMLElement>("[data-sort-item]")
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", String(index))
        if (item) event.dataTransfer.setDragImage(item, 16, 16)
        setFrom(index)
      },
      onDragEnd: reset,
    }),
    itemProps: (index: number) => ({
      "data-sort-item": "",
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (from === null) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        const rect = event.currentTarget.getBoundingClientRect()
        setSlot(event.clientY < rect.top + rect.height / 2 ? index : index + 1)
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        if (from === null || slot === null) return
        event.preventDefault()
        const to = slotToIndex(from, slot)
        reset()
        if (to !== from) onMove(from, to)
      },
    }),
  }
}
