# Release Checklist

## Before Tagging

1. Update the version in `package.json`.
2. Review the release-related files:

   ```bash
   git diff -- package.json README.md .github/workflows/release.yml
   ```

3. Commit and push the release changes on your default branch.

## Tag and Publish

1. Create and push the release tag:

   ```bash
   git tag v$(node -p "require('./package.json').version")
   git push origin --tags
   ```

2. Wait for the `Build & Release` GitHub Actions workflow to finish.
3. Confirm the workflow opened or updated an automatic cask PR against the default branch.
4. Confirm the GitHub release contains:
   - `Bifrost-<version>-arm64-mac.zip`
   - `Bifrost-<version>-arm64-mac.zip.blockmap`
   - `Bifrost-<version>-mac.zip`
   - `Bifrost-<version>-mac.zip.blockmap`

## Post-Release Validation

1. Test the Homebrew install on a clean Mac or VM:

   ```bash
   brew untap pyalwin/bifrost || true
   brew tap pyalwin/bifrost https://github.com/pyalwin/bifrost
   brew install --cask pyalwin/bifrost/bifrost
   ```

2. Launch Bifrost and confirm the first-run Gatekeeper override instructions still match the actual behavior.
3. Merge the automated cask PR before validating Homebrew install.
4. If the workflow failed before opening the cask PR, do not retag immediately. Fix the workflow or cask generation issue first, then cut the next patch release.
