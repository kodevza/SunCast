import type maplibregl from 'maplibre-gl'
import { handleModeSelectionClick, resolveMouseDownDragState, resolveVertexDragPolygon } from './mapInteractionEditMode'
import type { CreateMapInteractionHandlersArgs } from './mapInteractionHandlers.common'
import {
  getEventLngLat,
  isMultiSelect,
  isSnapDisabled,
  setVertexAngleHint,
  startDrag,
} from './mapInteractionHandlers.common'
import { buildDrawingAngleHint, computeDrawingInteraction, getVertexDragPoint } from './mapInteractionHandlers.drawings'
import { handleDragMove, handleHoverSelection, handleOrbitSteerMove } from './mapInteractionHandlers.selection'

export function createMapInteractionHandlers({
  map,
  modelRef,
  constrainedDrawLengthM,
  hoveredEdgeLengthRef,
  dragStateRef,
  orbitSteerStateRef,
  setHoveredEdgeLength,
  setDrawingAngleHint,
  setVertexDragAngleHint,
  setDraftPreviewPoint,
}: CreateMapInteractionHandlersArgs) {
  const handleHoverMove = (event: maplibregl.MapMouseEvent) => {
    const { drawing, camera } = modelRef.current
    if (drawing.isDrawing && !camera.orbitEnabled) {
      const drawDraft = drawing.drawDraft
      const drawInteraction = computeDrawingInteraction(
        map,
        drawDraft,
        getEventLngLat(event),
        isSnapDisabled(event),
        constrainedDrawLengthM,
      )
      if (drawInteraction) {
        setDraftPreviewPoint(drawInteraction.previewPoint)
        setDrawingAngleHint(buildDrawingAngleHint(drawDraft.length, drawInteraction, event))
      } else {
        setDraftPreviewPoint(null)
        setDrawingAngleHint(null)
      }
    } else {
      setDraftPreviewPoint(null)
      setDrawingAngleHint(null)
    }

    handleHoverSelection({
      map,
      modelRef,
      dragStateRef,
      hoveredEdgeLengthRef,
      event,
      setHoveredEdgeLength,
    })
  }

  const finishGeometryDrag = () => {
    const dragState = dragStateRef.current
    if (!dragState) {
      return
    }

    dragStateRef.current = null
    map.dragPan.enable()
    map.getCanvas().style.cursor = ''
    setHoveredEdgeLength(null)
    setVertexDragAngleHint(null)
    if (dragState.invalidAttempted) {
      modelRef.current.selection.onMoveRejected()
    }
    modelRef.current.camera.onGeometryDragStateChange(false)
  }

  const finishOrbitSteer = () => {
    if (!orbitSteerStateRef.current) {
      return
    }
    orbitSteerStateRef.current = null
    map.dragPan.enable()
    map.getCanvas().style.cursor = ''
  }

  const finishInteractions = () => {
    finishGeometryDrag()
    finishOrbitSteer()
  }

  const handleClick = (event: maplibregl.MapMouseEvent & { originalEvent: MouseEvent }) => {
    const { drawing } = modelRef.current
    if (drawing.isDrawing) {
      const drawDraft = drawing.drawDraft
      const drawInteraction = computeDrawingInteraction(
        map,
        drawDraft,
        getEventLngLat(event),
        isSnapDisabled(event),
        constrainedDrawLengthM,
      )
      if (drawInteraction && drawInteraction.closePolygonPoint !== null) {
        drawing.closeDrawing()
        return
      }
      drawing.commitDrawPoint(drawInteraction?.snapped.point ?? getEventLngLat(event))
      return
    }

    handleModeSelectionClick(map, modelRef.current, event.point, isMultiSelect(event))
  }

  const handleMouseDown = (event: maplibregl.MapMouseEvent) => {
    const isMiddleButton = event.originalEvent instanceof MouseEvent && event.originalEvent.button === 1
    if (modelRef.current.camera.orbitEnabled && isMiddleButton) {
      orbitSteerStateRef.current = {
        lastScreenPoint: [event.point.x, event.point.y],
      }
      map.dragPan.disable()
      map.getCanvas().style.cursor = 'grabbing'
      setVertexDragAngleHint(null)
      event.originalEvent.preventDefault()
      return
    }

    if (modelRef.current.drawing.isDrawing || modelRef.current.camera.orbitEnabled) {
      return
    }

    const dragState = resolveMouseDownDragState(map, modelRef.current, event.point, getEventLngLat(event))
    if (!dragState) {
      return
    }
    startDrag(map, modelRef, dragStateRef, dragState, setVertexDragAngleHint)
    if (dragState.type === 'edge') {
      return
    }
    const movedPoint = getEventLngLat(event)
    const angleDeg = getVertexDragPoint(
      resolveVertexDragPolygon(modelRef.current, dragState),
      dragState.index,
      movedPoint,
      false,
    ).angleDeg
    setVertexAngleHint(setVertexDragAngleHint, event, angleDeg)
  }

  const handleMouseMove = (event: maplibregl.MapMouseEvent) => {
    handleOrbitSteerMove(map, modelRef, orbitSteerStateRef, event)
    handleHoverMove(event)
    handleDragMove({ modelRef, dragStateRef, setVertexDragAngleHint, event })
  }

  const emitBearing = () => {
    modelRef.current.camera.onBearingChange(map.getBearing())
  }

  const emitPitch = () => {
    modelRef.current.camera.onPitchChange(map.getPitch())
  }

  return {
    finishInteractions,
    handleClick,
    handleMouseDown,
    handleMouseMove,
    emitBearing,
    emitPitch,
  }
}
