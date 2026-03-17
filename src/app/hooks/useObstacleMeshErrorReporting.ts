import { useEffect, useRef } from 'react'
import { reportAppError } from '../../shared/errors'
import type { useObstacleMeshResults } from './useObstacleMeshResults'

type ObstacleMeshResult = ReturnType<typeof useObstacleMeshResults>['obstacleMeshResults'][number]

export function useObstacleMeshErrorReporting(obstacleMeshResults: ObstacleMeshResult[]): void {
  const reportedObstacleMeshErrorSignaturesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const signatures = new Set<string>()

    for (const result of obstacleMeshResults) {
      if (result.ok) {
        continue
      }

      const context = result.error.context ?? {}
      const signature = `${result.error.code}:${String(context.obstacleId ?? 'unknown')}:${String(context.reason ?? '')}`
      signatures.add(signature)
      if (!reportedObstacleMeshErrorSignaturesRef.current.has(signature)) {
        reportAppError(result.error)
        reportedObstacleMeshErrorSignaturesRef.current.add(signature)
      }
    }

    for (const existing of [...reportedObstacleMeshErrorSignaturesRef.current]) {
      if (!signatures.has(existing)) {
        reportedObstacleMeshErrorSignaturesRef.current.delete(existing)
      }
    }
  }, [obstacleMeshResults])
}
