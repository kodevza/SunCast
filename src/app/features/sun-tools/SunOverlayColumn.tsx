import { useState, type ReactNode } from 'react'
import { AnnualDayProfilePanel } from './AnnualDayProfilePanel'
import { AnnualSunAccessPanel } from './AnnualSunAccessPanel'
import { ForecastPvPanel } from './ForecastPvPanel'
import { MonthlyProductionPanel } from './MonthlyProductionPanel'
import { SunDateTimePanel } from './SunDateTimePanel'
import type { AnnualSunAccessController } from './useAnnualSunAccessController'
import type { SelectedRoofSunInput } from '../../../types/presentation-contracts'

interface SunOverlayColumnProps {
  children: ReactNode
  datetimeIso: string
  timeZone: string
  selectedRoofs: SelectedRoofSunInput[]
  onDatetimeInputChange: (datetimeIsoRaw: string) => void
  productionComputationEnabled: boolean
  annualSunAccess: AnnualSunAccessController
  expanded?: boolean
}

export function SunOverlayColumn({
  children,
  datetimeIso,
  timeZone,
  selectedRoofs,
  onDatetimeInputChange,
  productionComputationEnabled,
  annualSunAccess,
  expanded,
}: SunOverlayColumnProps) {
  const [collapsed, setCollapsed] = useState(() => (expanded === undefined ? true : !expanded))
  const [activeTab, setActiveTab] = useState<'annual' | 'tools'>('tools')
  const isCollapsed = expanded === undefined ? collapsed : !expanded

  return (
    <aside className={`sun-overlay-column${isCollapsed ? ' sun-overlay-column-collapsed' : ''}`}>
      <button
        type="button"
        className="sun-overlay-toggle"
        onClick={() => setCollapsed((current) => !current)}
        data-testid="sun-overlay-toggle"
      >
        {isCollapsed ? 'Sun tools' : 'Hide'}
      </button>
      {!isCollapsed && (
        <div className="sun-overlay-content">
          <div className="sun-overlay-tabs" role="tablist" aria-label="Sun overlay tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'tools'}
              className={`sun-overlay-tab${activeTab === 'tools' ? ' sun-overlay-tab-active' : ''}`}
              onClick={() => setActiveTab('tools')}
              data-testid="sun-overlay-tab-tools"
            >
              Sun Tools
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'annual'}
              className={`sun-overlay-tab${activeTab === 'annual' ? ' sun-overlay-tab-active' : ''}`}
              onClick={() => setActiveTab('annual')}
              data-testid="sun-overlay-tab-annual"
            >
              Annual Sun Access
            </button>            
          </div>

          {activeTab === 'annual' ? (
            <div role="tabpanel" aria-label="Annual Sun Access">
              <AnnualSunAccessPanel
                selectedRoofCount={annualSunAccess.selectedRoofCount}
                gridResolutionM={annualSunAccess.gridResolutionM}
                dateStartIso={annualSunAccess.dateStartIso}
                dateEndIso={annualSunAccess.dateEndIso}
                state={annualSunAccess.state}
                progressRatio={annualSunAccess.progressRatio}
                result={annualSunAccess.result}
                isAnnualHeatmapVisible={annualSunAccess.isAnnualHeatmapVisible}
                onGridResolutionChange={annualSunAccess.onGridResolutionChange}
                onDateStartIsoChange={annualSunAccess.onDateStartIsoChange}
                onDateEndIsoChange={annualSunAccess.onDateEndIsoChange}
                onRunSimulation={annualSunAccess.onRunSimulation}
                onClearSimulation={annualSunAccess.onClearSimulation}
                onShowAnnualHeatmap={annualSunAccess.onShowAnnualHeatmap}
                onHideAnnualHeatmap={annualSunAccess.onHideAnnualHeatmap}
              />
            </div>
          ) : (
            <div role="tabpanel" aria-label="Sun Tools">
              <SunDateTimePanel datetimeIso={datetimeIso} timeZone={timeZone} onDatetimeInputChange={onDatetimeInputChange} />
              <ForecastPvPanel
                datetimeIso={datetimeIso}
                selectedRoofs={selectedRoofs}
                computationEnabled={productionComputationEnabled}
              />
              {children}
              <MonthlyProductionPanel
                datetimeIso={datetimeIso}
                timeZone={timeZone}
                selectedRoofs={selectedRoofs}
                computationEnabled={productionComputationEnabled}
              />
              <AnnualDayProfilePanel
                datetimeIso={datetimeIso}
                timeZone={timeZone}
                selectedRoofs={selectedRoofs}
                computationEnabled={productionComputationEnabled}
              />
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
