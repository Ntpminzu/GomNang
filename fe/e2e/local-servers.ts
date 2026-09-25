import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('../../', import.meta.url))
const beDir = join(rootDir, 'be')
const feDir = join(rootDir, 'fe')
const nextBin = join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next')
const backendOrigin = 'http://127.0.0.1:4100'
const frontendOrigin = 'http://127.0.0.1:3100'

let backend: ChildProcess | null = null
let frontend: ChildProcess | null = null
let dataDir: string | null = null

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function waitUntilReady(url: string, process: ChildProcess, label: string) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`${label} đã thoát sớm với mã ${process.exitCode}.`)
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch { /* Server chưa mở cổng. */ }
    await pause(200)
  }
  throw new Error(`${label} không sẵn sàng sau 30 giây: ${url}`)
}

function stopTree(child: ChildProcess | null) {
  if (!child?.pid || child.exitCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    child.kill('SIGTERM')
  }
}

export async function startLocalServers() {
  try {
    dataDir = mkdtempSync(join(tmpdir(), 'gomnang-e2e-'))
    backend = spawn(process.execPath, ['--env-file-if-exists=.env', 'src/server.ts'], {
      cwd: beDir,
      env: {
        ...process.env,
        PORT: '4100',
        DATA_DIR: dataDir,
        JWT_SECRET: 'e2e-only-secret-0123456789abcdef',
      },
      stdio: 'ignore',
    })
    await waitUntilReady(`${backendOrigin}/health`, backend, 'Backend E2E')

    frontend = spawn(process.execPath, [nextBin, 'dev', '--port', '3100'], {
      cwd: feDir,
      env: {
      ...process.env,
      API_ORIGIN: backendOrigin,
      NEXT_PUBLIC_API_MODE: 'http',
    },
      stdio: 'ignore',
    })
    await waitUntilReady(frontendOrigin, frontend, 'Frontend E2E')
  } catch (error) {
    await stopLocalServers()
    throw error
  }
}

export async function stopLocalServers() {
  stopTree(frontend)
  stopTree(backend)
  await pause(300)
  if (dataDir) rmSync(dataDir, { recursive: true, force: true })
  // Next dev trỏ next-env.d.ts vào kiểu dev; typegen đưa file về đường dẫn build chuẩn.
  spawnSync(process.execPath, [nextBin, 'typegen'], {
    cwd: feDir,
    env: { ...process.env, NEXT_DIST_DIR: '.next' },
    stdio: 'ignore',
  })
  backend = null
  frontend = null
  dataDir = null
}
