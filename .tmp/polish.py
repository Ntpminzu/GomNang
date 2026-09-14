from pathlib import Path
import re, json
root=Path(__file__).resolve().parents[1]; be=root/'be'; fe=root/'fe'
def read(p): return p.read_text(encoding='utf-8')
def write(p,s): p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s.strip()+'\n',encoding='utf-8')
# Move database mappers to the module that owns each record.
source=read(be/'src/modules/projects/projects.mapper.ts')
header=source[:source.index('const iso')]
declarations={}
for m in re.finditer(r'^export const (to\w+Row)',source,re.M):
    end=source.index('\n})',m.start())+3
    declarations[m.group(1)]=source[m.start():end]
owners={'toUserRow':'modules/users/users.mapper.ts','toProjectRow':'modules/projects/projects.mapper.ts','toNeedRow':'modules/projects/projects.mapper.ts','toContributionRow':'modules/contributions/contributions.mapper.ts','toAssessmentRow':'modules/verification/verification.mapper.ts','toAuditRow':'infrastructure/audit/audit.mapper.ts'}
for path in set(owners.values()):
    h=header
    if path.startswith('infrastructure'): h=h.replace('../../infrastructure/database/schema.ts','../database/schema.ts')
    write(be/'src'/path,h+"const iso = (value: Date) => value.toISOString()\n"+'\n'.join(code for name,code in declarations.items() if owners[name]==path))
for p in (be/'src/modules').rglob('*.repository.ts'):
    s=read(p)
    def replace(m):
        statements=[]
        for name in m.group(1).split(','):
            name=name.strip()
            target=owners[name]
            rel='../../'+target if target.startswith('infrastructure') else '../'+target.removeprefix('modules/')
            statements.append(f"import {{ {name} }} from '{rel}'")
        return '\n'.join(statements)
    s=re.sub(r"import \{ ([^}]+) \} from '../projects/projects.mapper.ts'",replace,s)
    write(p,s)
# Project form behavior belongs to a feature hook; the component renders fields.
p=fe/'src/presentation/modules/projects/components/ProjectForm.tsx';s=read(p)
start=s.index('  const [mode,');end=s.index('  const errorList =')
hook=s[start:end]
guard_start=hook.index('  if (!ready)');guard_end=hook.index('  const me = user')
hook=hook[:guard_start]+hook[guard_end:]
hook=hook.replace('    if (!members) return','    if (!members || !me) return')
hook+='  const errorList = Object.entries(errors)\n'
hook+='  return { mode, user, ready, members, membersError, setLookupAttempt, form, errors, submitting, submitError, hasMoneyItem, update, updateNeed, handleSubmit, errorList, setForm }\n'
header=s[:s.index('const BENEFICIARY_GROUPS')]
header=header.replace("from '../types/", "from '../types/")
header+= "import { emptyNeed, toFormState, toInput, type FormState, type NeedDraft } from '../types/project-form.ts'\n"
write(fe/'src/presentation/modules/projects/hooks/use-project-form.ts',header+"export function useProjectForm(initial: ProjectInput | undefined, onSubmit: (input: ProjectInput, mode: DemoMode) => Promise<void>) {\n"+hook+'}')
guard=s[s.index('  if (!ready)'):s.index('  const me = user')]
return_pos=s.index('  return (',s.index('  const errorList ='))
s=s[:start]+"  const { mode, user, ready, members, membersError, setLookupAttempt, form, errors, submitting, submitError, hasMoneyItem, update, updateNeed, handleSubmit, errorList, setForm } = useProjectForm(initial, onSubmit)\n"+guard+s[return_pos:]
s="import { useProjectForm } from '../hooks/use-project-form.ts'\n"+s
# Keep directive first.
s=s.replace("import { useProjectForm } from '../hooks/use-project-form.ts'\n'use client'", "'use client'\nimport { useProjectForm } from '../hooks/use-project-form.ts'")
write(p,s)
# Runtime config paths and terminology.
for p in [*be.rglob('*.ts'),*be.rglob('*.json'),be/'.env.example',root/'.env.example']:
    if 'node_modules' in p.parts: continue
    s=read(p).replace('apps/api','be').replace('apps/web','fe')
    write(p,s)
# E2E uses independent Next caches; normal dev/build retain .next.
p=fe/'next.config.mjs';s=read(p).replace("  transpilePackages:","  distDir: process.env.NEXT_DIST_DIR ?? '.next',\n  transpilePackages:");write(p,s)
p=fe/'tsconfig.json';data=json.loads(read(p));data['exclude']=['node_modules','.next-e2e-http','.next-e2e-mock'];write(p,json.dumps(data,indent=2))
print('Feature hooks and module-owned mappers written')
