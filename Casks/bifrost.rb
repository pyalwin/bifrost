cask "bifrost" do
  arch arm: "arm64-mac", intel: "mac"

  version "1.1.0"
  sha256 arm: "274b867534d217ae9883de5d141021c93102b28890e5313810a8817bccd384da", intel: "a7432b422e1a3ed2ab755fec074770ba99dabd965be8ff8427811661b61a7660"

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
