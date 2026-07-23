import type { ProjectFramework, ProjectSourceFile } from "@/types/platform"

export type ProjectSetup = {
  framework: ProjectFramework
  installCommand: string
  buildCommand: string
  startCommand: string
}

function getPackage(files: ProjectSourceFile[]) {
  const file = files.find((item) => item.path === "package.json")
  if (!file) return null
  try {
    return JSON.parse(file.content) as {
      scripts?: Record<string, string>
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      packageManager?: string
    }
  } catch {
    return null
  }
}

export function detectProjectSetup(files: ProjectSourceFile[]): ProjectSetup {
  const pkg = getPackage(files)
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies }
  const paths = new Set(files.map((file) => file.path))
  const hasNext = Boolean(deps.next) || [...paths].some((path) => path.startsWith("next.config."))
  const hasVite = Boolean(deps.vite) || [...paths].some((path) => path.startsWith("vite.config."))
  const packageManager = pkg?.packageManager?.startsWith("yarn")
    ? "yarn"
    : pkg?.packageManager?.startsWith("npm")
      ? "npm"
      : "pnpm"

  const run = packageManager === "npm" ? "npm run" : packageManager
  const installCommand =
    packageManager === "npm" ? "npm install" : packageManager === "yarn" ? "yarn install" : "pnpm install"
  const scripts = pkg?.scripts ?? {}

  if (hasNext) {
    return {
      framework: "nextjs",
      installCommand,
      buildCommand: scripts.build ? `${run} build` : "pnpm build",
      startCommand: scripts.start ? `${run} start` : "pnpm start",
    }
  }

  if (hasVite) {
    return {
      framework: "vite",
      installCommand,
      buildCommand: scripts.build ? `${run} build` : "pnpm build",
      startCommand: scripts.preview ? `${run} preview -- --host 0.0.0.0 --port 3000` : "pnpm preview -- --host 0.0.0.0 --port 3000",
    }
  }

  return {
    framework: pkg ? "nextjs" : "static",
    installCommand: pkg ? installCommand : "true",
    buildCommand: scripts.build ? `${run} build` : "true",
    startCommand: scripts.start ? `${run} start` : "npx serve . -l 3000",
  }
}
