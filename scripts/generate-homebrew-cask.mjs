import { createHash } from 'crypto'
import { execFileSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const rootDir = process.cwd()
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))
const version = process.env.BIFROST_VERSION ?? packageJson.version
const tagPrefix = process.env.BIFROST_TAG_PREFIX ?? 'v'
const outputPath = join(rootDir, 'Casks', 'bifrost.rb')

function sha256For(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function parseGitHubRepo(remoteUrl) {
  if (remoteUrl.startsWith('http://') || remoteUrl.startsWith('https://')) {
    const url = new URL(remoteUrl)
    const parts = url.pathname.replace(/^\/+/, '').split('/')
    if (parts.length < 2) {
      throw new Error(`Could not parse GitHub repo from remote: ${remoteUrl}`)
    }

    return {
      owner: parts[0],
      repo: parts[1].replace(/\.git$/, ''),
    }
  }

  const match = remoteUrl.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/.]+?)(?:\.git)?$/)
  if (!match?.groups) {
    throw new Error(`Could not parse GitHub repo from remote: ${remoteUrl}`)
  }

  return match.groups
}

function resolveRepo() {
  const repoOverride = process.env.BIFROST_GITHUB_REPO
  if (repoOverride) {
    const [owner, repo] = repoOverride.split('/')
    if (owner && repo) {
      return { owner, repo }
    }
    throw new Error(`BIFROST_GITHUB_REPO must look like "owner/repo", got: ${repoOverride}`)
  }

  const remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim()

  return parseGitHubRepo(remoteUrl)
}

function renderCask({ owner, repo, currentVersion, armSha256, intelSha256 }) {
  return `cask "bifrost" do
  arch arm: "arm64", intel: "mac"

  version "${currentVersion}"
  sha256 arm: "${armSha256}", intel: "${intelSha256}"

  url "https://github.com/${owner}/${repo}/releases/download/${tagPrefix}#{version}/Bifrost-#{version}-#{arch}.zip"
  name "Bifrost"
  desc "Visual desktop UI for Claude Code"
  homepage "https://github.com/${owner}/${repo}"

  depends_on macos: ">= :monterey"

  app "Bifrost.app"

  zap trash: [
    "~/Library/Application Support/Bifrost",
    "~/Library/Preferences/com.bifrost.app.plist",
    "~/Library/Saved Application State/com.bifrost.app.savedState",
  ]

  caveats <<~EOS
    Bifrost is distributed without Apple Developer ID signing or notarization.
    If macOS blocks the first launch, open System Settings > Privacy & Security
    and click "Open Anyway" for Bifrost.
  EOS
end
`
}

const armZipPath = join(rootDir, 'dist', `Bifrost-${version}-arm64-mac.zip`)
const intelZipPath = join(rootDir, 'dist', `Bifrost-${version}-mac.zip`)

if (!existsSync(armZipPath) || !existsSync(intelZipPath)) {
  throw new Error(
    `Expected zip artifacts at ${armZipPath} and ${intelZipPath}. Run npm run build:mac first.`
  )
}

const { owner, repo } = resolveRepo()
const armSha256 = sha256For(armZipPath)
const intelSha256 = sha256For(intelZipPath)

mkdirSync(join(rootDir, 'Casks'), { recursive: true })
writeFileSync(
  outputPath,
  renderCask({ owner, repo, currentVersion: version, armSha256, intelSha256 }),
  'utf8'
)

console.log(`Wrote ${outputPath}`)
