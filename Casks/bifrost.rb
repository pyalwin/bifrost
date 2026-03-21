cask "bifrost" do
  arch arm: "arm64", intel: "mac"

  version "1.0.1"
  sha256 arm: "4e134a872e016514ccabfd2c3b7fadf25d6a4c1c7a82d00903eaf92a4f0ddf69", intel: "c6cc8af78a588cd42972a845c6d58076076b5575a60eb6d13b689887d56ad151"

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
