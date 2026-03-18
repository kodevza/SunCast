import { MapView } from '../features/map-editor/MapView/MapView'
import { SunDailyChartPanel } from '../features/sun-tools/SunDailyChartPanel'
import { SunOverlayColumn } from '../features/sun-tools/SunOverlayColumn'
import { SunProjectionStatus } from '../features/sun-tools/SunProjectionStatus'
import { useMapViewController } from '../features/map-editor/MapView/useMapViewController'
import { useSunToolsController } from '../features/sun-tools/useSunToolsController'

export function SunCastCanvas() {
  const mapView = useMapViewController()
  const sunTools = useSunToolsController()

  return (
    <main className="sun-cast-canvas">
      <MapView model={mapView.model} onInitialized={mapView.onInitialized} />

      <SunOverlayColumn
        datetimeIso={sunTools.sunDatetimeRaw}
        timeZone={sunTools.sunDailyTimeZone}
        selectedRoofs={sunTools.selectedRoofInputs}
        onDatetimeInputChange={sunTools.onSunDatetimeInputChange}
        productionComputationEnabled={sunTools.productionComputationEnabled}
        annualSunAccess={sunTools.annualSunAccess}
        expanded={sunTools.hasSolvedActiveRoof && !mapView.model.drawing.isDrawingRoof && !mapView.model.drawing.isDrawingObstacle}
      >
        {sunTools.hasSolvedActiveRoof ? (
          <>
            <SunProjectionStatus
              enabled={sunTools.sunProjectionEnabled}
              hasDatetime={sunTools.hasValidSunDatetime}
              onToggleEnabled={sunTools.onToggleSunProjectionEnabled}
              result={mapView.model.view.sunProjectionResult}
            />
            <SunDailyChartPanel
              dateIso={sunTools.sunDailyDateRaw}
              timeZone={sunTools.sunDailyTimeZone}
              selectedRoofs={sunTools.selectedRoofInputs}
              computationEnabled={sunTools.productionComputationEnabled}
            />
          </>
        ) : (
          <section className="panel-section">
            <h3>Sun Tools</h3>
            <p>Solve a roof plane first to enable projection and daily production chart.</p>
          </section>
        )}
      </SunOverlayColumn>
    </main>
  )
}
