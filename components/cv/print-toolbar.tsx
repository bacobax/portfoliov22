"use client"

export function PrintToolbar() {
  return (
    <div className="toolbar">
      <button type="button" onClick={() => window.print()} className="toolbar__button">
        PRINT / SAVE AS PDF
      </button>
    </div>
  )
}
