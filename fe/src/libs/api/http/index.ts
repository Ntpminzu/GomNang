import type { ApiAdapter } from '../contracts.ts'
import { request, type RequestClient } from '../client.ts'
import { projectsHttp } from './projects.ts'
import { usersHttp } from './users.ts'
import { verificationHttp } from './verification.ts'
import { contributionsHttp } from './contributions.ts'
export function createHttpApi(client: RequestClient = request): ApiAdapter {
  return { ...projectsHttp(client), ...usersHttp(client), ...verificationHttp(client), ...contributionsHttp(client) }
}
export const httpApi = createHttpApi()
