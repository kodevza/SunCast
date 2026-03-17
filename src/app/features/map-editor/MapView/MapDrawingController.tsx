import { useRef } from 'react'
import type { DrawingAngleHint } from './hooks/useMapInteractions'
import { useDrawLengthShortcut } from './hooks/useDrawLengthShortcut'

interface MapDrawingControllerProps {
  drawingAngleHint: DrawingAngleHint
  drawLengthInput: string
  onDrawLengthInputChange: (value: string) => void
  onDrawLengthInputSubmit: () => void
  enabled: boolean
}

export function MapDrawingController({
  drawingAngleHint,
  drawLengthInput,
  onDrawLengthInputChange,
  onDrawLengthInputSubmit,
  enabled,
}: MapDrawingControllerProps) {
  const drawLengthInputRef = useRef<HTMLInputElement | null>(null)
  useDrawLengthShortcut({
    enabled,
    inputRef: drawLengthInputRef,
  })

  return (
    <div
      className="map-draw-angle-label"
      style={{ left: `${drawingAngleHint.left}px`, top: `${drawingAngleHint.top}px` }}
      data-testid="map-draw-angle-label"
    >
      {drawingAngleHint.lengthM.toFixed(2)} m
      {drawingAngleHint.secondPointPreview && drawingAngleHint.azimuthDeg !== null && drawingAngleHint.angleFromSouthDeg !== null
        ? ` | az ${drawingAngleHint.azimuthDeg.toFixed(1)} deg | S ${drawingAngleHint.angleFromSouthDeg.toFixed(1)} deg`
        : drawingAngleHint.angleDeg !== null
          ? ` | ${drawingAngleHint.angleDeg.toFixed(1)} deg`
          : ''}
      {drawingAngleHint.snapped ? ' snap' : ''}
      <label className="map-draw-length-input-wrap" onMouseDown={(event) => event.stopPropagation()}>
        <span>Edge</span>
        <input
          type="number"
          min={0}
          step={0.01}
          inputMode="decimal"
          placeholder={drawingAngleHint.lengthM.toFixed(2)}
          value={drawLengthInput}
          title="Set exact edge length (m). Press Enter to commit point."
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onDrawLengthInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.stopPropagation()
              onDrawLengthInputSubmit()
            }
          }}
          className="map-draw-length-input"
          data-testid="map-draw-length-input"
          ref={drawLengthInputRef}
        />
        <span>m</span>
      </label>
    </div>
  )
}
