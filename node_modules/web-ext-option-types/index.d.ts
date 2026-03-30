export type BrowserTarget = 'firefox-desktop' | 'firefox-android' | 'chromium'

export interface RunOptions {
  /**
   * The extensions runners to enable. Specify this option multiple times to run 
   * against multiple targets.
   *
   * @default "firefox-desktop"
   */
  target: BrowserTarget | readonly BrowserTarget[] | undefined
  /**
   * Path or alias to a Firefox executable such as firefox-bin or firefox.exe. If 
   * not specified, the default Firefox will be used. You can specify the following 
   * aliases in lieu of a path: firefox, beta, nightly, firefoxdeveloperedition (or 
   * deved). For Flatpak, use `flatpak:org.mozilla.firefox` where 
   * `org.mozilla.firefox` is the application ID.
   */
  firefoxBinary?: string | undefined
  /**
   * Run Firefox using a copy of this profile. The profile can be specified as a 
   * directory or a name, such as one you would see in the Profile Manager. If not 
   * specified, a new temporary profile will be created.
   */
  firefoxProfile?: string | undefined
  /**
   * Path or alias to a Chromium executable such as google-chrome, google-chrome.exe 
   * or opera.exe etc. If not specified, the default Google Chrome will be used.
   */
  chromiumBinary?: string | undefined
  /**
   * Path to a custom Chromium profile
   */
  chromiumProfile?: string | undefined
  /**
   * Create the profile directory if it does not already exist
   */
  profileCreateIfMissing?: boolean | undefined
  /**
   * Run Firefox directly in custom profile. Any changes to the profile will be 
   * saved.
   */
  keepProfileChanges?: boolean | undefined
  /**
   * Reload the extension when source files change.Disable with --no-reload.
   *
   * @default true
   */
  reload: boolean | undefined
  /**
   * Reload the extension only when the contents of this file changes. This is 
   * useful if you use a custom build process for your extension
   */
  watchFile?: readonly string[] | undefined
  /**
   * Paths and globs patterns that should not be watched for changes. This is useful 
   * if you want to explicitly prevent web-ext from watching part of the extension 
   * directory tree, e.g. the node_modules folder.
   */
  watchIgnored?: readonly string[] | undefined
  /**
   * Pre-install the extension into the profile before startup. This is only needed 
   * to support older versions of Firefox.
   */
  preInstall?: boolean | undefined
  /**
   * Launch firefox with a custom preference (example: 
   * --pref=general.useragent.locale=fr-FR). You can repeat this option to set more 
   * than one preference.
   */
  pref?: readonly string[] | undefined
  /**
   * Launch firefox at specified page
   */
  startUrl?: string | readonly string[] | undefined
  /**
   * Open the DevTools for the installed add-on (Firefox 106 and later)
   */
  devtools?: boolean | undefined
  /**
   * Open the DevTools Browser Console.
   */
  browserConsole?: boolean | undefined
  /**
   * Additional CLI options passed to the Browser binary
   */
  args?: readonly string[] | undefined
  /**
   * Specify a custom path to the adb binary
   */
  adbBin?: string | undefined
  /**
   * Connect to adb on the specified host
   */
  adbHost?: string | undefined
  /**
   * Connect to adb on the specified port
   */
  adbPort?: string | undefined
  /**
   * Connect to the specified adb device name
   */
  adbDevice?: string | undefined
  /**
   * Number of milliseconds to wait before giving up
   */
  adbDiscoveryTimeout?: number | undefined
  /**
   * Remove old artifacts directories from the adb device
   */
  adbRemoveOldArtifacts?: boolean | undefined
  /**
   * Run a specific Firefox for Android APK. Example: org.mozilla.fennec_aurora
   */
  firefoxApk?: string | undefined
  /**
   * Run a specific Android Component (defaults to <firefox-apk>/.App)
   */
  firefoxApkComponent?: string | undefined
}

export interface BuildOptions {
  /**
   * Watch for file changes and re-build as needed
   */
  asNeeded?: boolean | undefined
  /**
   * Name of the created extension package file.
   */
  filename?: string | undefined
  /**
   * Overwrite destination package if it exists.
   */
  overwriteDest?: boolean | undefined
}

export interface SignOptions {
  /**
   * Submission API URL prefix
   *
   * @default "https://addons.mozilla.org/api/v5/"
   */
  amoBaseUrl: string
  /**
   * API key (JWT issuer) from addons.mozilla.org
   */
  apiKey: string
  /**
   * API secret (JWT secret) from addons.mozilla.org
   */
  apiSecret: string
  /**
   * Use a proxy to access the signing API. Example: https://yourproxy:6000 
   */
  apiProxy?: string | undefined
  /**
   * Number of milliseconds to wait before giving up
   */
  timeout?: number | undefined
  /**
   * Number of milliseconds to wait for approval before giving up. Set to 0 to 
   * disable waiting for approval. Fallback to `timeout` if not set.
   */
  approvalTimeout?: number | undefined
  /**
   * The channel for which to sign the addon. Either 'listed' or 'unlisted'.
   */
  channel: 'listed' | 'unlisted'
  /**
   * Path to a JSON file containing an object with metadata to be passed to the API. 
   * See https://addons-server.readthedocs.io/en/latest/topics/api/addons.html for 
   * details.
   */
  amoMetadata?: string | undefined
  /**
   * Path to an archive file containing human readable source code of this 
   * submission, if the code in --source-dir has been processed to make it 
   * unreadable. See 
   * https://extensionworkshop.com/documentation/publish/source-code-submission/ for 
   * details.
   */
  uploadSourceCode?: string | undefined
}
