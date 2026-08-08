/// <reference lib="webworker" />
import { groupResumes } from './similarity'
import type { ResumeGroup, ResumeRecord } from './types'

self.onmessage = (e: MessageEvent<ResumeRecord[]>) => {
  const groups: ResumeGroup[] = groupResumes(e.data)
  self.postMessage(groups)
}