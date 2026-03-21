'use client'
import dynamic from 'next/dynamic'

const ScoreRingDynamic = dynamic(
  () => import('@/components/charts/ScoreRing'),
  { ssr: false }
)

export default ScoreRingDynamic