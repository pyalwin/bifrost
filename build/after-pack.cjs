const { existsSync } = require('fs')
const { join } = require('path')
const { spawnSync } = require('child_process')

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
  })

  const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()

  if (result.status !== 0) {
    const error = new Error(output || `${command} ${args.join(' ')} failed`)
    error.output = output
    throw error
  }

  return output
}

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') {
    return
  }

  const appName = `${context.packager.appInfo.productFilename}.app`
  const appPath = join(context.appOutDir, appName)

  if (!existsSync(appPath)) {
    throw new Error(`Expected packaged app at ${appPath}`)
  }

  let signatureDetails = ''
  try {
    signatureDetails = run('codesign', ['-dvvv', appPath])
  } catch (error) {
    signatureDetails = error.output || ''
  }

  // Electron 39 + electron-builder 26 can leave mac bundles in a malformed
  // partially signed state when no Developer ID identity is configured.
  if (signatureDetails.includes('Sealed Resources=none') || !signatureDetails.includes('Identifier=')) {
    run('codesign', ['--force', '--deep', '--sign', '-', appPath])
  }

  run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath])
}
