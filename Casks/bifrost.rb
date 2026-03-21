cask "bifrost" do
  arch arm: "arm64-mac", intel: "mac"

  version "1.0.4"
  sha256 arm: "8c8fbf0dd1b8d779ac8d19b1537e75bfad99a534efb61d123e9ec557d030289f", intel: "d3ec5fedfff4c545a7bae655d5791456630957aa55515a135688ccfe1a5f9875"

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
