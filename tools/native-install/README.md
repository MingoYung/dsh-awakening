# Native first-screen compatibility installer

This optional tool manages the earliest startup page for the independently
verified Windows DSH NEXT 2.0.19-next, 2.0.21-next, 2.0.22-next,
2.0.23-next and 2.0.24-next builds. The normal animation plugin works without it. The UI action prepares all files, starts an independent helper,
waits for its ready/armed handshake, then asks the native desktop to quit.
The helper waits for every DSH NEXT process to exit before atomically changing
`resources/app.asar` and reopening the app. There is no fixed relaunch delay
and no force-stop operation.

No npm, Python, network access or separate Node installation is needed. The
manual entry uses DSH's bundled Node runtime:

Version 0.7.3 requires one explicit carrier update from an identified older
installation: choose Update and restart in the plugin's first-screen settings.
If a desktop update has replaced the carrier with a supported pristine archive,
choose Install and restart to establish that build's own verified original backup.
Updating the plugin alone does not modify app.asar. Normal Host-injected playback
remains available before this explicit carrier operation.

Each desktop build has a separate fixed profile, selected by its exact EXE
SHA256 before any installer worker is started. Its original ASAR, candidate
ASAR and reviewed payload files are independently pinned. An unknown build does
not fall back to the old profile. Desktop updates may replace app.asar; use
Install or Update again after an explicitly supported desktop update.
The verified 2.0.21-next through 2.0.24-next patches preserve the native
boot documentId/profile contract and renderer health reporting. In 2.0.24-next,
main.js directly imports web-document-BjG9-N6z.js. Its policy pins the new
main call site and the implementation that it actually loads. The patch retains
native request and forwarding guards along with the desktop's startup timeout
and renderer performance sampling. See the core verification record for the
ordinary plugin interfaces in the bundled 0.2.2-rc.5 kernel. The HTTP management
routes also apply the Host connection admission check before native authorization.

The update preserves the verified original archive, saved settings and user
animation library. Each policy records the accepted package versions and carrier
history for its own build. The carrier reads the saved selection and verified local MP4/WebM
on each startup.
Changing the selected work does not rewrite the application archive.
DeepSeek, Codex and Claude Code share media/builtins.json with normal Host
playback, including the same safe-camera descriptor and single video clock
for composition and sound. The historical builtin:awakening ID still selects
DeepSeek. Creator videos remain data, never executable author code; an
invalid custom entry skips the early carrier and leaves Host fallback
available.

```powershell
& .\Install-FirstScreen.ps1
& .\Install-FirstScreen.ps1 -Action Inspect
& .\Install-FirstScreen.ps1 -Action Rollback
```

The default executable is `%LOCALAPPDATA%\Programs\DSH NEXT\DSH NEXT.exe`.
Use `-Executable 'C:\absolute\path\DSH NEXT.exe'` for an explicit alternative;
the same binary/archive whitelist is still enforced. In the manual route,
quit from DSH's own menu/tray when prompted. An external script cannot safely
substitute a main-window close for the app's real quit operation. The plugin
settings button can call the authenticated native quit API automatically.

The installer checks EXE, archive, payload and the sixteen runtime/media files before
arming. Unsupported versions or changed files stop without changing the app.
The original archive is preserved at
`resources/.dsh-awakening-backup/app.asar`; a previous managed patch is upgraded
from this verified original, never used as the original backup. Originals and
managed archive hashes are never transferred between desktop profiles; a
2.0.23-next backup cannot restore a 2.0.24-next installation. Rollback does
not require healthy source animation files. Metadata lives under the adjacent
`jobs/` directory and reports only fixed error codes to the plugin UI.

The helper waits up to 90 seconds for exit. Cancellation uses a one-way flag,
and the authorization is rechecked immediately before replacement. A failed
handshake cleans up only its owned helper process; it never terminates DSH.
The GUI relaunch explicitly removes `ELECTRON_RUN_AS_NODE` from the helper's
environment. Safety/recovery mode is skipped by the native carrier.

ASAR serialization and integrity metadata use the vendored official
`@electron/asar@4.0.1` Pickle and integrity files under `vendor/`, with the
complete MIT license retained. The native payload adapts the separately
credited MIT DSH Desktop sources. No EXE, security fuse, shortcut or user
Profile is modified.

Version 0.7.3 checks cover the bundled core, Host route admission, and
first-screen installation and restoration on isolated archives. See
`../../verification/v0.7.3.json` for the scope and results.
