from pathlib import Path
import re, json

root = Path(__file__).resolve().parents[1]
be = root / 'be'
src = be / 'src'
def read(p): return p.read_text(encoding='utf-8')
def write(p, s):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(s.strip()+'\n', encoding='utf-8')
def fun(s, name):
    m = re.search(r'^(?:export )?(?:async )?function '+name+r'(?:<[^\n]+>)?\(', s, re.M)
    assert m, name
    end = s.index('\n}', m.start())+2
    return s[m.start():end]
def exported(s): return s if s.startswith('export ') else 'export '+s
repo = read(src/'db/repo.ts')
routes = read(src/'routes.ts')
http = read(src/'http.ts')
auth = read(src/'auth.ts')

for old,new in [('db/client.ts','infrastructure/database/client.ts'),('db/schema.ts','infrastructure/database/schema.ts'),('db/seed.ts','infrastructure/database/seed.ts'),('config.ts','config/env.ts')]:
    if (src/old).exists():
        write(src/new, read(src/old))
        (src/old).unlink()
p=src/'infrastructure/database/client.ts'
write(p,read(p).replace("new URL('../../drizzle'", "new URL('../../../drizzle'"))
p=be/'drizzle.config.ts'
write(p,read(p).replace('./src/db/schema.ts','./src/infrastructure/database/schema.ts'))
p=src/'server.ts'
write(p,read(p).replace('./config.ts','./config/env.ts').replace('./db/','./infrastructure/database/').replace("'./http.ts'","'./infrastructure/logging/logger.ts'"))

write(src/'infrastructure/logging/logger.ts', "export type Level = 'info' | 'warn' | 'error'\n\n"+fun(http,'log'))
err = http[http.index('export class HttpError'):http.index('/**\n * Đổi kết quả')]
err += "\nconst STATUS_BY_KIND = { forbidden: 403, conflict: 409, invalid: 422 } as const\n\n"+fun(http,'ensure')
write(src/'common/errors/http-error.ts', "import type { RuleResult } from '@gomnang/domain/rules.ts'\n\n"+err)
reqlog=http[http.index('export const requestLog'):http.index('// ---------------------------------------------------------------------------\n// Lỗi:')]
write(src/'common/middleware/request-log.ts', "import { randomUUID } from 'node:crypto'\nimport type { RequestHandler } from 'express'\nimport { log, type Level } from '../../infrastructure/logging/logger.ts'\n\n"+reqlog)
write(src/'common/middleware/error-handler.ts', "import type { ErrorRequestHandler, RequestHandler } from 'express'\nimport { HttpError } from '../errors/http-error.ts'\nimport { log } from '../../infrastructure/logging/logger.ts'\n\n"+http[http.index('export const notFound'):])
write(src/'common/middleware/validation.ts', """
import type { RequestHandler, Response } from 'express'
import { z } from 'zod'
import { HttpError } from '../errors/http-error.ts'
"""+fun(http,'parseBody')+"""

export function validateBody<T extends z.ZodType>(schema: T): RequestHandler {
  return (req, res, next) => { res.locals.input = parseBody(schema, req.body); next() }
}
export function validateId(code: string, message: string): RequestHandler {
  return (req, res, next) => {
    const parsed = z.uuid().safeParse(req.params.id)
    if (!parsed.success) throw new HttpError(404, code, message)
    res.locals.resourceId = parsed.data
    next()
  }
}
export const inputOf = <T>(res: Response): T => res.locals.input as T
export const idOf = (res: Response): string => res.locals.resourceId as string
""")
write(src/'common/types/dependencies.ts', """
import type { Db } from '../../infrastructure/database/client.ts'
export type AppDeps = {
  db: Db
  secret: Uint8Array
  devLoginEnabled: boolean
  today: () => string
}
""")

# Database-only mapping: no HTTP or framework dependency.
mapper=repo[repo.index('const iso'):repo.index('// ---------- Người dùng')]
mapper=re.sub(r'^const (to\w+Row)',r'export const \1',mapper,flags=re.M)
type_import=repo[repo.index('import type {'):repo.index("import { latestAssessment")]
type_import=type_import[:type_import.index("import type { Exec }")] if "import type { Exec }" in type_import else type_import
mapper_header=type_import+"import { assessments, auditLog, contributions, needItems, projects, users } from '../../infrastructure/database/schema.ts'\n"
write(src/'modules/projects/projects.mapper.ts',mapper_header+mapper)
repo_header="""
import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm'
import type { AssessmentResult } from '@gomnang/domain/assess.ts'
import type { AssessmentRow, AuditRow, ContributionRow, ContributionStatus, NeedItem, NeedRow, ProjectDetail, ProjectInput, ProjectRow, ProjectStatus, ProjectSummary, QueueItem, UserRow } from '@gomnang/domain/types.ts'
import { latestAssessment, toDetail, toNeedItems, toSummary, userRef } from '@gomnang/domain/views.ts'
import type { Exec } from '../../infrastructure/database/client.ts'
import { assessments, auditLog, contributions, needItems, projects, users } from '../../infrastructure/database/schema.ts'
import { toUserRow, toProjectRow, toNeedRow, toContributionRow, toAuditRow, toAssessmentRow } from '../projects/projects.mapper.ts'
"""
project_funcs=['findProject','loadChildren','loadDetail','listSummaries','activeProjectNames','loadProjectInput','replaceNeeds','insertProject','updateProjectContent','setProjectStatus']
content=repo[repo.index('const projectContent'):repo.index('export async function insertProject')]
write(src/'modules/projects/projects.repository.ts',repo_header+"\nimport { usersById } from '../users/users.repository.ts'\n"+content+'\n\n'.join(exported(fun(repo,n)) for n in project_funcs))
write(src/'modules/users/users.repository.ts',repo_header+'\n\n'.join(exported(fun(repo,n)) for n in ['findUser','findUserByEmail','listUsers','usersById']))
write(src/'modules/verification/verification.repository.ts',repo_header+"\nimport { loadChildren } from '../projects/projects.repository.ts'\nimport { usersById } from '../users/users.repository.ts'\n"+'\n\n'.join(fun(repo,n) for n in ['listQueue','insertAssessment']))
write(src/'modules/contributions/contributions.repository.ts',repo_header+'\n\n'.join(fun(repo,n) for n in ['findNeed','lockNeedWithTotals','insertContribution','findContribution','setContributionStatus']))
write(src/'infrastructure/audit/audit.repository.ts', "import type { AuditRow } from '@gomnang/domain/types.ts'\nimport type { Exec } from '../database/client.ts'\nimport { auditLog } from '../database/schema.ts'\n\n"+fun(repo,'appendAudit'))

# Split auth into service (no Express), middleware, controller and router.
write(src/'modules/auth/auth.types.ts',"""
import type { UserRow } from '@gomnang/domain/types.ts'
import type { AppDeps } from '../../common/types/dependencies.ts'
import type * as users from '../users/users.repository.ts'
export type AuthDeps = AppDeps & { users: Pick<typeof users, 'findUser' | 'findUserByEmail'> }
export type AuthUser = UserRow
export type LoginInput = { email: string }
""")
user_fn=fun(auth,'userFromRequest').replace('async function userFromRequest(req: Request, deps: AppDeps)', 'async function authenticate(header: string | undefined, deps: AuthDeps)').replace("  const header = req.get('authorization')\n",'').replace('findUser(deps.db,','deps.users.findUser(deps.db,')
write(src/'modules/auth/auth.service.ts',"""
import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import type { UserRow } from '@gomnang/domain/types.ts'
import { toMember } from '@gomnang/domain/views.ts'
import { HttpError } from '../../common/errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'
import type { AuthDeps, LoginInput } from './auth.types.ts'
const ISSUER = 'gomnang-api'
const TOKEN_TTL = '8h'
"""+fun(auth,'signToken')+'\n\n'+exported(user_fn)+"""

export async function login(input: LoginInput, deps: AuthDeps) {
  const user = await deps.users.findUserByEmail(deps.db, input.email.toLowerCase())
  if (!user) throw new HttpError(404, 'USER_NOT_FOUND', `Không có tài khoản mẫu nào dùng email ${input.email}.`)
  log('info', 'dev login', { userId: user.id })
  return { token: await signToken(user.id, deps.secret), user: { ...toMember(user), email: user.email } }
}
""")
mw="import type { RequestHandler, Response } from 'express'\nimport { HttpError } from '../../common/errors/http-error.ts'\nimport { authenticate } from './auth.service.ts'\nimport type { AuthDeps, AuthUser } from './auth.types.ts'\n"
for n in ['optionalAuth','requireAuth','currentUser','maybeUser']:
    mw+='\n'+fun(auth,n).replace('AppDeps','AuthDeps').replace('UserRow','AuthUser').replace('userFromRequest(req, deps)',"authenticate(req.get('authorization'), deps)")+'\n'
mw+="""
export function requireDevLogin(enabled: boolean): RequestHandler {
  return (_req, _res, next) => {
    if (!enabled) throw new HttpError(404, 'NOT_FOUND', 'Không có endpoint POST /api/auth/dev-login.')
    next()
  }
}
"""
write(src/'modules/auth/auth.middleware.ts',mw)
write(src/'modules/auth/auth.schema.ts',"import { z } from 'zod'\nexport const loginBody = z.object({ email: z.email() })")
write(src/'modules/auth/auth.controller.ts',"""
import type { RequestHandler } from 'express'
import { inputOf } from '../../common/middleware/validation.ts'
import { login } from './auth.service.ts'
import type { AuthDeps, LoginInput } from './auth.types.ts'
export const loginController = (deps: AuthDeps): RequestHandler => async (_req, res) => {
  res.json(await login(inputOf<LoginInput>(res), deps))
}
""")
write(src/'modules/auth/auth.route.ts',"""
import { Router } from 'express'
import { validateBody } from '../../common/middleware/validation.ts'
import { requireDevLogin } from './auth.middleware.ts'
import { loginBody } from './auth.schema.ts'
import { loginController } from './auth.controller.ts'
import type { AuthDeps } from './auth.types.ts'
export function authRoutes(deps: AuthDeps) {
  const router = Router()
  router.post('/api/auth/dev-login', requireDevLogin(deps.devLoginEnabled), validateBody(loginBody), loginController(deps))
  return router
}
""")

# Reuse exact transaction bodies, but receive input/actor rather than HTTP objects.
header="""
import { assessProject } from '@gomnang/domain/assess.ts'
import { canCommit, canEditProject, canReviewProject, canSubmitProject, canTransitionContribution, canViewProject } from '@gomnang/domain/rules.ts'
import { PUBLIC_PROJECT_STATUSES, type ProjectInput, type UserRow, type ReviewInput, type CommitInput, type TransitionTarget } from '@gomnang/domain/types.ts'
import { validateProject } from '@gomnang/domain/validate-project.ts'
import type { Exec } from '../../infrastructure/database/client.ts'
import { HttpError, ensure } from '../../common/errors/http-error.ts'
import { log } from '../../infrastructure/logging/logger.ts'
"""
proj_err="export const projectNotFound = () => new HttpError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')\n"
contrib_err="const contributionNotFound = () => new HttpError(404, 'CONTRIBUTION_NOT_FOUND', 'Không tìm thấy đóng góp.')\n"
check=fun(routes,'checkProjectRules').replace('coordinatorId: string)', "coordinatorId: string, findUser: ProjectsDeps['users']['findUser'])").replace('repo.findUser(exec,','findUser(exec,')
write(src/'modules/projects/projects.validation.ts',header+"import type { ProjectsDeps } from './projects.types.ts'\n"+exported(check))

specs={
 'projects': [ ('listProjects','get','/api/projects','',None,False),('getProject','get','/api/projects/:id','id: string, user: UserRow | null',None,True),('createProject','post','/api/projects','input: ProjectInput, user: UserRow','projectBody',False),('updateProject','put','/api/projects/:id','id: string, input: ProjectInput, user: UserRow','projectBody',True)],
 'verification':[('getQueue','get','/api/verification-queue','user: UserRow',None,False),('submitProject','post','/api/projects/:id/submit','id: string, user: UserRow',None,True),('reviewProject','post','/api/projects/:id/review','id: string, input: ReviewInput, user: UserRow','reviewBody',True)],
 'contributions':[('commitContribution','post','/api/projects/:id/contributions','id: string, input: CommitInput, user: UserRow','commitBody',True),('transitionContribution','post','/api/contributions/:id/transition','id: string, to: TransitionTarget, user: UserRow','transitionBody',True)]
}
repo_groups={'projects':['projects','users','audit'],'verification':['projects','users','verification','audit'],'contributions':['projects','contributions','audit']}
func_owner={n:'projects' for n in project_funcs}
func_owner.update({n:'verification' for n in ['listQueue','insertAssessment']})
func_owner.update({n:'contributions' for n in ['findNeed','lockNeedWithTotals','insertContribution','findContribution','setContributionStatus']})
func_owner['appendAudit']='audit'
schema_project=routes[routes.index('const MAX_QUANTITY'):routes.index('const reviewBody')]
schema_project=schema_project.replace('const projectBody','export const projectBody')
write(src/'modules/projects/projects.schema.ts',"import { z } from 'zod'\nimport { NEED_KINDS } from '@gomnang/domain/types.ts'\n"+schema_project)
write(src/'modules/verification/verification.schema.ts',"import { z } from 'zod'\nexport const reviewBody = z.object({ decision: z.enum(['approve', 'reject']), reason: z.string().trim().max(1000).optional() })")
write(src/'modules/contributions/contributions.schema.ts',"import { z } from 'zod'\nexport const commitBody = z.object({ needItemId: z.uuid(), quantity: z.number().max(10_000_000) })\nexport const transitionBody = z.object({ to: z.enum(['delivered', 'confirmed']) })")

for mod,entries in specs.items():
    cls=mod.title()+'Deps'
    types="import type { AppDeps } from '../../common/types/dependencies.ts'\n"
    for group in repo_groups[mod]:
        path='../../infrastructure/audit/audit.repository.ts' if group=='audit' else f'../{group}/{group}.repository.ts'
        types+=f"import type * as {group} from '{path}'\n"
    types+=f'export type {cls} = AppDeps & {{ '+ '; '.join(f'{g}: typeof {g}' for g in repo_groups[mod])+' }\n'
    write(src/f'modules/{mod}/{mod}.types.ts',types)
    service=header+f"import type {{ {cls} }} from './{mod}.types.ts'\n"+proj_err+contrib_err
    if mod in ['projects','verification']: service+="import { checkProjectRules } from '../projects/projects.validation.ts'\n"
    controller="import type { RequestHandler } from 'express'\nimport { idOf, inputOf } from '../../common/middleware/validation.ts'\nimport { currentUser, maybeUser } from '../auth/auth.middleware.ts'\nimport type { ProjectInput, ReviewInput, CommitInput, TransitionTarget } from '@gomnang/domain/types.ts'\n"+f"import * as service from './{mod}.service.ts'\nimport type {{ {cls} }} from './{mod}.types.ts'\n"
    mw="import { validateBody, validateId } from '../../common/middleware/validation.ts'\n"
    schemas=sorted({x[4] for x in entries if x[4]})
    if schemas: mw+=f"import {{ {', '.join(schemas)} }} from './{mod}.schema.ts'\n"
    mw+="export const projectId = validateId('PROJECT_NOT_FOUND', 'Không tìm thấy dự án.')\n"
    if mod=='contributions': mw+="export const contributionId = validateId('CONTRIBUTION_NOT_FOUND', 'Không tìm thấy đóng góp.')\n"
    for s in schemas: mw+=f'export const {s}Input = validateBody({s})\n'
    write(src/f'modules/{mod}/{mod}.middleware.ts',mw)
    route="import { Router, type RequestHandler } from 'express'\n"+f"import * as controller from './{mod}.controller.ts'\nimport * as middleware from './{mod}.middleware.ts'\nimport type {{ {cls} }} from './{mod}.types.ts'\n"
    route+=f"export function {mod}Routes(deps: {cls}, auth: RequestHandler, guestOrUser: RequestHandler) {{\n  const router = Router()\n"
    for name,method,url,params,schema,has_id in entries:
        pattern=r"  router\."+method+r"\('"+re.escape(url)+r"', (?:auth, |guestOrUser, )?async \([^\n]+\) => \{\n"
        match=re.search(pattern,routes); assert match, name
        end=routes.index('\n  })',match.end())
        body=routes[match.end():end]
        body=re.sub(r'^    const (?:user|id|input|\{ to \}) = (?:currentUser|idParam|parseBody)\([^\n]*\)\n','',body,flags=re.M)
        body=body.replace('maybeUser(res)','user').replace('currentUser(res)','user')
        body=body.replace('res.json(', 'return (')
        body=body.replace('res.status(201).location(`/api/projects/${id}`).json(', 'return (')
        body=body.replace('res.status(201).json(', 'return (')
        body=body.replace('input, user.id)','input, user.id, deps.users.findUser)').replace('input, project.coordinatorId)','input, project.coordinatorId, deps.users.findUser)')
        for fn,owner in func_owner.items(): body=body.replace('repo.'+fn+'(',f'deps.{owner}.{fn}(')
        service+=f'\nexport async function {name}(deps: {cls}'+(', '+params if params else '')+') {\n  const { db } = deps\n'+body+'\n}\n'
        args=[]
        if has_id: args.append('idOf(res)')
        if schema: args.append({'projectBody':'inputOf<ProjectInput>(res)','reviewBody':'inputOf<ReviewInput>(res)','commitBody':'inputOf<CommitInput>(res)','transitionBody':'inputOf<{ to: TransitionTarget }>(res).to'}[schema])
        if 'user:' in params: args.append('maybeUser(res)' if 'null' in params else 'currentUser(res)')
        controller+=f'\nexport const {name} = (deps: {cls}): RequestHandler => async (_req, res) => {{\n  const result = await service.{name}(deps'+(', '+', '.join(args) if args else '')+')\n'
        if name=='createProject': controller+='  res.status(201).location(`/api/projects/${result!.id}`).json(result)\n'
        elif name=='commitContribution': controller+='  res.status(201).json(result)\n'
        else: controller+='  res.json(result)\n'
        controller+='}\n'
        middle=[] if name=='listProjects' else ['guestOrUser' if name=='getProject' else 'auth']
        if has_id: middle+=['middleware.contributionId' if name=='transitionContribution' else 'middleware.projectId']
        if schema: middle+=['middleware.'+schema+'Input']
        route+=f"  router.{method}('{url}', "+', '.join(middle+[f'controller.{name}(deps)'])+')\n'
    route+='  return router\n}\n'
    write(src/f'modules/{mod}/{mod}.service.ts',service)
    write(src/f'modules/{mod}/{mod}.controller.ts',controller)
    write(src/f'modules/{mod}/{mod}.route.ts',route)

write(src/'modules/users/users.types.ts',"import type { AppDeps } from '../../common/types/dependencies.ts'\nimport type * as users from './users.repository.ts'\nexport type UsersDeps = AppDeps & { users: typeof users }")
write(src/'modules/users/users.service.ts',"import { toMember } from '@gomnang/domain/views.ts'\nimport type { UsersDeps } from './users.types.ts'\nexport async function listMembers(deps: UsersDeps) { return (await deps.users.listUsers(deps.db)).map(toMember) }")
write(src/'modules/users/users.controller.ts',"import type { RequestHandler } from 'express'\nimport type { UsersDeps } from './users.types.ts'\nimport { listMembers } from './users.service.ts'\nexport const listMembersController = (deps: UsersDeps): RequestHandler => async (_req, res) => { res.json(await listMembers(deps)) }")
write(src/'modules/users/users.route.ts',"import { Router, type RequestHandler } from 'express'\nimport type { UsersDeps } from './users.types.ts'\nimport { listMembersController } from './users.controller.ts'\nexport function usersRoutes(deps: UsersDeps, auth: RequestHandler) {\n  const router = Router()\n  router.get('/api/users', auth, listMembersController(deps))\n  return router\n}")
oldapp=read(src/'app.ts')
health=oldapp[oldapp.index("  app.get('/health'"):oldapp.index('\n  app.use(authRoutes')]
health=health[health.index('    try {'):health.rindex('\n  })')]
write(src/'health/health.controller.ts',"import { sql } from 'drizzle-orm'\nimport type { RequestHandler } from 'express'\nimport type { AppDeps } from '../common/types/dependencies.ts'\nimport { log } from '../infrastructure/logging/logger.ts'\nexport function healthController(deps: AppDeps): RequestHandler {\n  const startedAt = Date.now()\n  return async (_req, res) => {\n"+health+'\n  }\n}')
write(src/'health/health.route.ts',"import { Router } from 'express'\nimport type { AppDeps } from '../common/types/dependencies.ts'\nimport { healthController } from './health.controller.ts'\nexport function healthRoutes(deps: AppDeps) { const router = Router(); router.get('/health', healthController(deps)); return router }")
write(src/'app.ts',"""
import express from 'express'
import type { AppDeps } from './common/types/dependencies.ts'
import { requestLog } from './common/middleware/request-log.ts'
import { errorHandler, notFound } from './common/middleware/error-handler.ts'
import { healthRoutes } from './health/health.route.ts'
import { authRoutes } from './modules/auth/auth.route.ts'
import { optionalAuth, requireAuth } from './modules/auth/auth.middleware.ts'
import { usersRoutes } from './modules/users/users.route.ts'
import { projectsRoutes } from './modules/projects/projects.route.ts'
import { verificationRoutes } from './modules/verification/verification.route.ts'
import { contributionsRoutes } from './modules/contributions/contributions.route.ts'
import * as users from './modules/users/users.repository.ts'
import * as projects from './modules/projects/projects.repository.ts'
import * as verification from './modules/verification/verification.repository.ts'
import * as contributions from './modules/contributions/contributions.repository.ts'
import * as audit from './infrastructure/audit/audit.repository.ts'

/** Composition root: routes receive explicit dependencies; services never import one another. */
export function createApp(deps: AppDeps) {
  const app = express()
  const authDeps = { ...deps, users }
  const auth = requireAuth(authDeps)
  const guest = optionalAuth(authDeps)
  app.disable('x-powered-by')
  app.use(requestLog)
  app.use(express.json({ limit: '100kb' }))
  app.use(healthRoutes(deps))
  app.use(authRoutes(authDeps))
  app.use(usersRoutes({ ...deps, users }, auth))
  app.use(projectsRoutes({ ...deps, users, projects, audit }, auth, guest))
  app.use(verificationRoutes({ ...deps, users, projects, verification, audit }, auth, guest))
  app.use(contributionsRoutes({ ...deps, projects, contributions, audit }, auth, guest))
  app.use(notFound)
  app.use(errorHandler)
  return app
}
""")
for old in ['auth.ts','http.ts','routes.ts','db/repo.ts']: (src/old).unlink()
(src/'db').rmdir()
test=read(be/'test/api.test.ts').replace("'../src/","'../../src/").replace('/db/','/infrastructure/database/')
write(be/'tests/integration/api.test.ts',test)
(be/'test/api.test.ts').unlink(); (be/'test').rmdir()
p=be/'tsconfig.json'; write(p,read(p).replace('"test"','"tests"'))
p=be/'package.json'; data=json.loads(read(p)); data['scripts']['test']='node --test "tests/**/*.test.ts"'; write(p,json.dumps(data,indent=2))
print('Backend modules written')
