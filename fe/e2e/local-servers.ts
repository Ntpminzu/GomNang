import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
const rootDir = fileURLToPath(new URL('../../', import.meta.url))
const feDir = join(rootDir, 'fe')
const nextBin = join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next')
const backendOrigin = 'http://127.0.0.1:4100', frontendOrigin = 'http://127.0.0.1:3100'
let backend: ChildProcess | null = null, frontend: ChildProcess | null = null, dataDir: string | null = null
let logs = ''
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))
function capture(child: ChildProcess) {
  for (const stream of [child.stdout, child.stderr]) stream?.on('data', (chunk: Buffer) => { logs = (logs + chunk.toString()).slice(-6000) })
}
async function waitUntilReady(url: string, child: ChildProcess, label: string) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(label + ' exited: ' + child.exitCode + '\n' + logs)
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1500) })).ok) return } catch {}
    await pause(200)
  }
  throw new Error(label + ' readiness timeout\n' + logs)
}
function stopTree(child: ChildProcess | null) {
  if (!child?.pid || child.exitCode !== null) return
  if (process.platform === 'win32') {
    const stopped = spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { encoding: 'utf8', windowsHide: true })
    if (stopped.status !== 0 && stopped.status !== 128) {
      // The child can exit between the exitCode check and taskkill completing.
      try { process.kill(child.pid, 0) }
      catch (err) { if ((err as NodeJS.ErrnoException).code === 'ESRCH') return }
      throw new Error('Cannot stop owned E2E process tree; status=' + stopped.status + '; ' + stopped.stderr.trim())
    }
  }
  else child.kill('SIGTERM')
}
async function waitUntilStopped(url: string) {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    try { await fetch(url, { signal: AbortSignal.timeout(500), headers: { connection: 'close' } }) }
    catch { return }
    await pause(100)
  }
  throw new Error('E2E server did not stop: ' + url)
}
export async function startLocalServers() {
  try {
    logs = ''
    for (const url of [backendOrigin + '/health', frontendOrigin]) {
      let occupied = false
      try { await fetch(url, { signal: AbortSignal.timeout(1000) }); occupied = true } catch {}
      if (occupied) throw new Error('E2E port already in use: ' + url)
    }
    dataDir = mkdtempSync(join(tmpdir(), 'gomnang-e2e-'))
    backend = spawn(process.execPath, ['e2e/backend.ts'], {
      cwd: feDir, windowsHide: true,
      env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: '', DATA_DIR: dataDir, JWT_SECRET: 'e2e-only-secret-0123456789abcdef', LOG_SILENT: '1' },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    })
    capture(backend)
    await waitUntilReady(backendOrigin + '/health', backend, 'Backend E2E')
    frontend = spawn(process.execPath, [nextBin, 'dev', '--port', '3100'], {
      cwd: feDir, windowsHide: true,
      env: { ...process.env, NODE_ENV: 'development', API_ORIGIN: backendOrigin, NEXT_PUBLIC_API_MODE: 'http', NEXT_DIST_DIR: '.next-e2e-us1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    capture(frontend)
    await waitUntilReady(frontendOrigin, frontend, 'Frontend E2E')
  } catch (err) { await stopLocalServers(); throw err }
}
/** Restarts only the backend owned by this isolated E2E fixture; keeps its temporary database. */
export async function restartLocalBackend() {
  if (!backend || !dataDir) throw new Error('E2E backend is not owned by this fixture')
  const current = backend
  const exited = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('E2E backend shutdown timeout')), 10_000)
    current.once('exit', () => { clearTimeout(timer); resolve() })
  })
  current.send({ type: 'shutdown' })
  await exited
  await waitUntilStopped(backendOrigin + '/health')
  backend = spawn(process.execPath, ['e2e/backend.ts'], {
    cwd: feDir, windowsHide: true,
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: '', DATA_DIR: dataDir, JWT_SECRET: 'e2e-only-secret-0123456789abcdef', LOG_SILENT: '1' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })
  capture(backend)
  await waitUntilReady(backendOrigin + '/health', backend, 'Backend E2E restart')
}

export async function stopLocalServers() {
  const ownedBackend = backend !== null, ownedFrontend = frontend !== null
  stopTree(frontend); stopTree(backend)
  await Promise.all([
    ownedBackend ? waitUntilStopped(backendOrigin + '/health') : Promise.resolve(),
    ownedFrontend ? waitUntilStopped(frontendOrigin) : Promise.resolve(),
  ])
  if (dataDir) {
    const target = resolve(dataDir)
    if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('gomnang-e2e-')) throw new Error('Refusing cleanup outside E2E temp directory')
    rmSync(target, { recursive: true, force: true })
  }
  spawnSync(process.execPath, [nextBin, 'typegen'], { cwd: feDir, env: { ...process.env, NEXT_DIST_DIR: '.next' }, stdio: 'ignore', windowsHide: true })
  backend = null; frontend = null; dataDir = null
}
