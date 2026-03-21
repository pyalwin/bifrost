cask "bifrost" do
  arch arm: "arm64-mac", intel: "mac"

  version "1.0.5"
  sha256 arm: "13dde28b96ea2b29cd8786c8a7ee1cfd590181fdb4127513a3712337066fa9c4", intel: "7de8e2235934803bef5814dc15e19ce86e988c9c8eed3ab262b374d267251533"

  url "https://github.com/pyalwin/bifrost/releases/download/v#{version}/Bifrost-#{version}-#{arch}.zip"
  name "Bifrost"
  desc "Visual desktop UI for Claude Code"
  homepage "https://github.com/pyalwin/bifrost"

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
