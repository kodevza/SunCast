interface DrawToolsProps {
  isDrawing: boolean
  pointCount: number
  onStart: () => void
  onUndo: () => void
  onCancel: () => void
  onCommit: () => void
}

export function DrawTools({
  isDrawing,
  pointCount,
  onStart,
  onUndo,
  onCancel,
  onCommit,
}: DrawToolsProps) {
  return (
    <section className="panel-section">
      <h3>Footprint</h3>
      {!isDrawing ? (
        <button type="button" onClick={onStart}>
          Draw Footprint
        </button>
      ) : (
        <div className="draw-actions">
          <p>Click on map to add vertices ({pointCount})</p>
          <button type="button" onClick={onUndo} disabled={pointCount === 0}>
            Undo
          </button>
          <button type="button" onClick={onCommit} disabled={pointCount < 3}>
            Finish Polygon
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}
    </section>
  )
}
