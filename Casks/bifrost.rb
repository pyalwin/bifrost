cask "bifrost" do
  arch arm: "arm64-mac", intel: "mac"

  version "1.0.8"
  sha256 arm: "2b8a294cbd9d110996b74e71a2bd4673f4883c64bd432640409e47980338a874", intel: "a20fa24e253ffb906ec11e2e22595492df2219ae7ea3fe87090efef42704b503"

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
