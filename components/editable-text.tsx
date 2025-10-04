"use client"

import { Fragment, useState, useRef, useEffect } from "react"
import type { KeyboardEvent, ReactNode, RefObject } from "react"

export function formatMultilineText(value: string): ReactNode {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return value.length > 0 ? value : null
  }

  const blocks = value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)

  if (blocks.length === 0) {
    return null
  }

  return blocks.map((block, blockIndex) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (lines.length === 0) {
      return null
    }

    const isOrderedList = lines.every((line) => /^\d+\.\s+/.test(line))
    const isUnorderedList = lines.every((line) => /^[-*+]\s+/.test(line))

    if (isOrderedList || isUnorderedList) {
      const ListTag = (isOrderedList ? "ol" : "ul") as "ol" | "ul"
      const listClassName = `${isOrderedList ? "list-decimal" : "list-disc"} pl-5 space-y-1`

      return (
        <ListTag key={`list-${blockIndex}`} className={listClassName}>
          {lines.map((line, lineIndex) => (
            <li key={`list-item-${blockIndex}-${lineIndex}`}>
              {line.replace(isOrderedList ? /^\d+\.\s+/ : /^[-*+]\s+/, "")}
            </li>
          ))}
        </ListTag>
      )
    }

    return (
      <p key={`paragraph-${blockIndex}`} className={blockIndex > 0 ? "mt-2" : undefined}>
        {lines.map((line, lineIndex) => (
          <Fragment key={`line-${blockIndex}-${lineIndex}`}>
            {line}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </Fragment>
        ))}
      </p>
    )
  })
}

interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  isEditorMode: boolean
  className?: string
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span"
  multiline?: boolean
}

export function EditableText({
  value,
  onChange,
  isEditorMode,
  className = "",
  as = "p",
  multiline = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.select()
      }
    }
  }, [isEditing])

  const handleClick = () => {
    if (isEditorMode) {
      setIsEditing(true)
    }
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (editValue !== value) {
      onChange(editValue)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault()
      handleBlur()
    }
    if (e.key === "Escape") {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  const Tag = as

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`${className} bg-background border-2 border-primary p-2 w-full resize-none`}
          rows={3}
        />
      )
    }
    return (
      <input
        ref={inputRef as RefObject<HTMLInputElement>}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${className} bg-background border-2 border-primary p-2 w-full`}
      />
    )
  }

  const DisplayTag = (multiline ? "div" : Tag) as typeof Tag

  return (
    <DisplayTag
      onClick={handleClick}
      className={`${className} ${isEditorMode ? "editable-content" : ""}`}
      title={isEditorMode ? "Click to edit" : undefined}
    >
      {multiline ? formatMultilineText(value) : value}
    </DisplayTag>
  )
}
