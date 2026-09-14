import { Router } from 'express'
import type { AppDeps } from '../common/types/dependencies.ts'
import { healthController } from './health.controller.ts'
export function healthRoutes(deps: AppDeps) { const router = Router(); router.get('/health', healthController(deps)); return router }
