# Release Checklist

## Before Tagging

1. Update the version in `package.json`.
2. Build the macOS release artifacts:

   ```bash
   npm run build:mac
   ```

3. Regenerate the Homebrew cask:

   ```bash
   npm run generate:cask
   ```

4. Review the release-related files:

   ```bash
   git diff -- package.json Casks/bifrost.rb README.md .github/workflows/release.yml
   ```

5. Commit and push the release changes on your default branch.

## Tag and Publish

1. Create and push the release tag:

   ```bash
   git tag v$(node -p "require('./package.json').version")
   git push origin --tags
   ```

2. Wait for the `Build & Release` GitHub Actions workflow to finish.
3. Confirm the GitHub release contains:
   - `Bifrost-<version>-arm64-mac.zip`
   - `Bifrost-<version>-arm64-mac.zip.blockmap`
   - `Bifrost-<version>-mac.zip`
   - `Bifrost-<version>-mac.zip.blockmap`

## Post-Release Validation

1. Test the Homebrew install on a clean Mac or VM:

   ```bash
   brew tap pyalwin/bifrost https://github.com/pyalwin/bifrost
   brew install --cask pyalwin/bifrost/bifrost
   ```

2. Launch Bifrost and confirm the first-run Gatekeeper override instructions still match the actual behavior.
3. If the workflow failed on the cask consistency check, regenerate the cask locally, commit the updated `Casks/bifrost.rb`, and retag from that commit.
