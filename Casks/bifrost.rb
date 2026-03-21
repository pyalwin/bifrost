cask "bifrost" do
  arch arm: "arm64-mac", intel: "mac"

  version "1.0.2"
  sha256 arm: "042db82e761e36f81ff22ce3c4a74729b95e0d458b5bac180bf8525efff77038", intel: "2c0ded3e44b395ce652ece6bc21c885cf8dc344caeb609de0579d992333c99e3"

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
