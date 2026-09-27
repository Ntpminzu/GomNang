import type { RequestHandler } from 'express'
import type { ExpenseInput, ExpenseReviewInput, UpdateInput } from '@gomnang/domain/types.ts'
import { idOf, inputOf } from '../../common/middleware/validation.ts'
import { currentUser } from '../auth/auth.middleware.ts'
import * as service from './transparency.service.ts'
import type { TransparencyDeps } from './transparency.types.ts'

export const postUpdate = (deps: TransparencyDeps): RequestHandler => async (_req, res) => {
  res.status(201).json(await service.postUpdate(deps, idOf(res), inputOf<UpdateInput>(res), currentUser(res)))
}

export const recordExpense = (deps: TransparencyDeps): RequestHandler => async (_req, res) => {
  res.status(201).json(await service.recordExpense(deps, idOf(res), inputOf<ExpenseInput>(res), currentUser(res)))
}

export const reviewExpense = (deps: TransparencyDeps): RequestHandler => async (_req, res) => {
  res.json(await service.reviewExpense(deps, idOf(res), inputOf<ExpenseReviewInput>(res), currentUser(res)))
}
