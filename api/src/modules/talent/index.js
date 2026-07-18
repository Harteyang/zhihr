import { routes as candidatesRoutes } from './candidates.js'
import { routes as experiencesRoutes } from './experiences.js'
import { routes as attachmentsRoutes } from './attachments.js'
import { routes as uploadRoutes } from './upload.js'
import { routes as previewRoutes } from './preview.js'
import { routes as aiParserRoutes } from './ai-parser.js'
import { routes as parseQueueRoutes } from './parse-queue.js'
import { routes as excelImportRoutes } from './excel-import.js'
import { routes as evaluationsRoutes } from './evaluations.js'
import { routes as shareLinksRoutes } from './share-links.js'
import { routes as sharePublicRoutes } from './share-public.js'
import { routes as followRecordsRoutes } from './follow-records.js'

export const routes = [
  ...candidatesRoutes,
  ...experiencesRoutes,
  ...attachmentsRoutes,
  ...uploadRoutes,
  ...previewRoutes,
  ...aiParserRoutes,
  ...parseQueueRoutes,
  ...excelImportRoutes,
  ...evaluationsRoutes,
  ...shareLinksRoutes,
  ...sharePublicRoutes,
  ...followRecordsRoutes
]

export { checkPositionPermission } from './permissions.js'
export { VALID_STATUSES, getMimeType, createCandidateFromParse } from './candidates.js'
export { callAIWithFallback } from './ai-parser.js'
