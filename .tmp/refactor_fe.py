from pathlib import Path
import re, json
root=Path(__file__).resolve().parents[1]
fe=root/'fe'; src=fe/'src'
def read(p): return p.read_text(encoding='utf-8')
def write(p,s):
    p.parent.mkdir(parents=True,exist_ok=True); p.write_text(s.strip()+'\n',encoding='utf-8')
def fun(s,name):
    m=re.search(r'^(?:export )?(?:async )?function '+name+r'(?:<[^\n]+>)?\(',s,re.M)
    assert m,name
    return s[m.start():s.index('\n}',m.start())+2]
api=read(fe/'lib/api.ts'); ui=read(fe/'components/ui.tsx'); panels=read(fe/'components/ProjectPanels.tsx')
session=read(fe/'lib/session.ts'); form=read(fe/'components/ProjectForm.tsx')

write(src/'libs/api/errors.ts',api[api.index('export class ApiError'):api.index('// ---------------------------------------------------------------------------\n// Chế độ demo:')])
demo=api[api.index('export type DemoMode'):api.index('// ---------------------------------------------------------------------------\n// Kho dữ liệu giả.')]
write(src/'libs/api/demo.ts',demo)
write(src/'libs/api/mock/session.ts',session)
# Mock engine retains the existing storage key and rules. Move endpoint groups out of its store.
api_imports=api[:api.index('/**\n * MOCK API')].replace("'./session.ts'","'./session.ts'")
api_imports+="\nimport { ApiError } from '../errors.ts'\nimport type { DemoMode } from '../demo.ts'\n"
store=api[api.index('type Store ='):api.index('// ---------------------------------------------------------------------------\n// Các "endpoint".')]
store=re.sub(r'^(?=(?:async )?function |const |type Store)', 'export ',store,flags=re.M)
write(src/'libs/api/mock/store.ts',api_imports+store)
groups={'projects':['listProjects','getProject','createProject','updateProject'], 'users':['listMembers'], 'verification':['getVerificationQueue','submitProject','reviewProject'], 'contributions':['commitContribution','transitionContribution']}
helpers=re.findall(r'^export (?:async )?function (\w+)|^export const (\w+)',store,re.M)
helpernames=[a or b for a,b in helpers]
shared="import { "+', '.join(helpernames)+" } from './store.ts'\n"
for mod,names in groups.items():
    write(src/f'libs/api/mock/{mod}.ts',api_imports+shared+'\n\n'.join(fun(api,n) for n in names))
write(src/'libs/api/contracts.ts',"""
import type { CommitInput, Contribution, Member, ProjectDetail, ProjectInput, ProjectSummary, QueueItem, ReviewInput, TransitionTarget } from '@gomnang/domain/types.ts'
import type { DemoMode } from './demo.ts'
export interface ApiAdapter {
  listProjects(mode?: DemoMode): Promise<ProjectSummary[]>
  getProject(id: string, mode?: DemoMode): Promise<ProjectDetail>
  listMembers(mode?: DemoMode): Promise<Member[]>
  getVerificationQueue(mode?: DemoMode): Promise<QueueItem[]>
  createProject(input: ProjectInput, mode?: DemoMode): Promise<ProjectDetail>
  updateProject(id: string, input: ProjectInput, mode?: DemoMode): Promise<ProjectDetail>
  submitProject(id: string, mode?: DemoMode): Promise<ProjectDetail>
  reviewProject(id: string, input: ReviewInput, mode?: DemoMode): Promise<ProjectDetail>
  commitContribution(id: string, input: CommitInput, mode?: DemoMode): Promise<Contribution>
  transitionContribution(id: string, to: TransitionTarget, mode?: DemoMode): Promise<Contribution>
}
""")
mock_index="import type { ApiAdapter } from '../contracts.ts'\n"
for mod,names in groups.items(): mock_index+=f"import {{ {', '.join(names)} }} from './{mod}.ts'\nexport {{ {', '.join(names)} }} from './{mod}.ts'\n"
mock_index+="export { configureMock, resetMockData } from './store.ts'\nexport { ApiError } from '../errors.ts'\nexport const mockApi = { "+', '.join(n for names in groups.values() for n in names)+" } satisfies ApiAdapter\n"
write(src/'libs/api/mock/index.ts',mock_index)
test=read(fe/'lib/api.test.ts').replace("'./api.ts'","'../src/libs/api/mock/index.ts'").replace("'./session.ts'","'../src/libs/api/mock/session.ts'")
write(fe/'tests/mock-api.test.ts',test)

# First checkpoint uses mock; the second stage switches this default to HTTP.
write(src/'libs/config/env.ts',"""
const mode = process.env.NEXT_PUBLIC_API_MODE ?? 'mock'
if (mode !== 'mock' && mode !== 'http') throw new Error('NEXT_PUBLIC_API_MODE phải là mock hoặc http.')
export const apiMode: 'mock' | 'http' = mode
export const isMockMode = apiMode === 'mock'
""")
write(src/'libs/api/index.ts',"""
export * from './mock/index.ts'
export * from './errors.ts'
export * from './demo.ts'
""")
write(src/'libs/session/index.ts',"export * from '../api/mock/session.ts'")
write(src/'libs/utils/project.ts',"import type { ProjectDetail } from '@gomnang/domain/types.ts'\n"+panels[panels.index('export const projectRef'):panels.index('/** Chạy một thao tác ghi:')])
write(src/'libs/utils/date.ts',fun(ui,'formatTime'))
write(src/'presentation/types/project-panels.ts',"import type { ProjectDetail } from '@gomnang/domain/types.ts'\nimport type { SessionUser } from '../../libs/session/index.ts'\nimport type { DemoMode } from '../../libs/api/demo.ts'\n"+panels[panels.index('export type PanelProps'):panels.index('export const projectRef')])
write(src/'presentation/hooks/use-action.ts',"'use client'\nimport { useState } from 'react'\nimport { toApiError, type ApiError } from '../../libs/api/errors.ts'\n"+fun(panels,'useAction').replace('function useAction','export function useAction'))
write(src/'presentation/hooks/use-load.ts',read(fe/'lib/use-load.ts').replace("'./api.ts'","'../../libs/api/index.ts'").replace("'./session.ts'","'../../libs/session/index.ts'"))

common_names=['SkeletonCards','LoadingState','EmptyState','ErrorState','ApiErrorState','ErrorAlert','DemoSwitch','Field','a11yProps']
common_header="import { DEMO_MODES, type ApiError, type DemoMode } from '../../libs/api/index.ts'\nimport { isMockMode } from '../../libs/config/env.ts'\n"
common_code='\n\n'.join(fun(ui,n) for n in common_names)
common_code=common_code.replace("export function DemoSwitch({ mode, basePath }: { mode: DemoMode; basePath: string }) {", "export function DemoSwitch({ mode, basePath }: { mode: DemoMode; basePath: string }) {\n  if (!isMockMode) return null")
write(src/'presentation/components/ui.tsx',common_header+common_code)
write(src/'presentation/components/index.ts',"export * from './ui.tsx'")
feature_ui={'projects':['StatusBadge','NeedProgress','ProgressLegend'], 'verification':['VerdictBadge']}
for mod,names in feature_ui.items():
    write(src/f'presentation/modules/{mod}/components/status.tsx',"import { STATUS_LABEL, VERDICT_LABEL, type NeedItem, type ProjectStatus, type Verdict } from '@gomnang/domain/types.ts'\n"+'\n\n'.join(fun(ui,n) for n in names))

panel_header=panels[:panels.index('/**\n * Các khối thao tác')]
panel_header=panel_header[:panel_header.index("import { EmptyState")]
panel_header+="""
import { EmptyState, ErrorAlert, Field, a11yProps } from '../../../components/index.ts'
import { VerdictBadge } from '../../verification/components/status.tsx'
import { formatTime } from '../../../../libs/utils/date.ts'
import { projectRef } from '../../../../libs/utils/project.ts'
import type { PanelProps } from '../../../types/project-panels.ts'
import { useAction } from '../../../hooks/use-action.ts'
"""
panel_groups={'projects':['DraftPanel','AuditTable'],'verification':['AssessmentPanel','ReviewPanel'],'contributions':['CommitPanel','ContributionsTable']}
for mod,names in panel_groups.items():
    for name in names: write(src/f'presentation/modules/{mod}/components/{name}.tsx',panel_header+fun(panels,name))
    exports='\n'.join(f"export {{ {name} }} from './components/{name}.tsx'" for name in names)
    if mod in feature_ui: exports+="\nexport * from './components/status.tsx'"
    write(src/f'presentation/modules/{mod}/index.ts',exports)

# Separate form view-model, leaving React state and validation in a feature hook in stage two.
form_types=form[form.index('/** Trong form'):form.index('type Props =')]
form_types=form_types.replace('type NeedDraft','export type NeedDraft').replace('type FormState','export type FormState').replace('const emptyNeed','export const emptyNeed').replace('function toFormState','export function toFormState').replace('function toInput','export function toInput')
form_types=form_types.replace('export export','export')
write(src/'presentation/modules/projects/types/project-form.ts',"import type { NeedKind, ProjectDetail, ProjectInput } from '@gomnang/domain/types.ts'\n"+form_types)
form=form[:form.index('/** Trong form')]+"import { emptyNeed, toFormState, toInput, type FormState, type NeedDraft } from '../types/project-form.ts'\nexport { detailToInput } from '../types/project-form.ts'\n\n"+form[form.index('type Props ='):]
form=form.replace("from './ui.tsx'","from '../../../components/index.ts'")
write(src/'presentation/modules/projects/components/ProjectForm.tsx',form)
p=src/'presentation/modules/projects/index.ts'; write(p,read(p)+"\nexport { ProjectForm, detailToInput } from './components/ProjectForm.tsx'")
write(src/'presentation/modules/auth/components/UserSwitcher.tsx',read(fe/'components/UserSwitcher.tsx'))
write(src/'presentation/modules/auth/index.ts',"export { UserSwitcher } from './components/UserSwitcher.tsx'")

page_map={'page.tsx':('projects','ProjectListPage'),'projects/new/page.tsx':('projects','NewProjectPage'),'projects/[id]/page.tsx':('projects','ProjectDetailPage'),'projects/[id]/edit/page.tsx':('projects','EditProjectPage'),'verify/page.tsx':('verification','VerificationQueuePage')}
for rel,(mod,name) in page_map.items():
    code=read(fe/'app'/rel)
    code=re.sub(r'import \{([\s\S]*?)\} from [\'\"]@/components/ProjectPanels.tsx[\'\"]',lambda m:m.group(0),code) if False else code
    # Replace imports by exact module ownership, including multiline imports.
    owners={'DraftPanel':'projects','AuditTable':'projects','AssessmentPanel':'verification','ReviewPanel':'verification','CommitPanel':'contributions','ContributionsTable':'contributions','StatusBadge':'projects','NeedProgress':'projects','ProgressLegend':'projects','VerdictBadge':'verification','ProjectForm':'projects','detailToInput':'projects'}
    def redistribute(m):
        imports={}
        for token in m.group(1).split(','):
            token=token.strip()
            if not token: continue
            if token=='type PanelProps': path='@/presentation/types/project-panels.ts'
            elif token=='projectRef': path='@/libs/utils/project.ts'
            elif token in owners: path='@/presentation/modules/'+owners[token]+'/index.ts'
            else: path='@/presentation/components/index.ts'
            imports.setdefault(path,[]).append(token)
        return '\n'.join('import { '+', '.join(tokens)+" } from '"+path+"'" for path,tokens in imports.items())
    code=re.sub(r'import \{([^}]+)\} from [\'\"]@/components/(?:ui|ProjectPanels|ProjectForm).tsx[\'\"]',redistribute,code)
    # Import local project exports directly to keep the feature's public index acyclic.
    code=code.replace("from '@/presentation/modules/projects/index.ts'", "from '../index.ts'") if mod=='projects' else code
    write(src/f'presentation/modules/{mod}/pages/{name}.tsx',code)
    write(src/'app'/rel,f"import Screen from '@/presentation/modules/{mod}/pages/{name}.tsx'\nexport default function Page() {{ return <Screen /> }}")

layout=read(fe/'app/layout.tsx')
shell=layout[layout.index('        <a className="skip-link"'):layout.index('\n      </body>')]
write(src/'presentation/layouts/AppShell.tsx',"import Link from 'next/link'\nimport { UserSwitcher } from '../modules/auth/index.ts'\nimport { isMockMode } from '../../libs/config/env.ts'\nexport function AppShell({ children }: { children: React.ReactNode }) {\n  return <>\n"+shell+"\n  </>\n}")
write(src/'app/layout.tsx',"import type { Metadata } from 'next'\nimport { AppShell } from '@/presentation/layouts/AppShell.tsx'\nimport '@/presentation/styles/globals.css'\n"+layout[layout.index('export const metadata'):layout.index('export default function')]+"\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return <html lang=\"vi\"><body><AppShell>{children}</AppShell></body></html>\n}")
write(src/'presentation/styles/globals.css',read(fe/'app/globals.css'))
for p in src.rglob('*'):
    if p.suffix not in ['.ts','.tsx']: continue
    code=read(p).replace('@/lib/api.ts','@/libs/api/index.ts').replace('@/lib/session.ts','@/libs/session/index.ts').replace('@/lib/use-load.ts','@/presentation/hooks/use-load.ts')
    write(p,code)

ts=json.loads(read(fe/'tsconfig.json')); ts['compilerOptions']['paths']={'@/*':['./src/*']}; write(fe/'tsconfig.json',json.dumps(ts,indent=2))
pkg=json.loads(read(fe/'package.json')); pkg['scripts']['test']='node --test "tests/*.test.ts"'; pkg['scripts']['typecheck']='tsc --noEmit'; write(fe/'package.json',json.dumps(pkg,indent=2))
# Remove only files relocated above, retaining no parallel stale source tree.
for folder in ['app','components','lib']:
    original=fe/folder
    for p in list(original.rglob('*')):
        if p.is_file(): p.unlink()
    for p in sorted(original.rglob('*'),key=lambda x:len(x.parts),reverse=True):
        if p.is_dir(): p.rmdir()
    original.rmdir()
print('Frontend modules written')
