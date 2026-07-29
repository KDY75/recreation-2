param(
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$appDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeExecutable = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$appUrl = "http://localhost:3800/"

function Test-GameServer {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $appUrl -TimeoutSec 1
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

try {
  if (-not (Test-Path -LiteralPath $nodeExecutable)) {
    throw "The local app runtime is missing. Open this project in Codex once, then try again."
  }

  if (-not (Test-GameServer)) {
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $nodeExecutable
    $startInfo.Arguments = "node_modules\vinext\dist\cli.js dev --port 3800"
    $startInfo.WorkingDirectory = $appDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $process = [System.Diagnostics.Process]::Start($startInfo)

    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
      Start-Sleep -Milliseconds 500
      if (Test-GameServer) {
        $ready = $true
        break
      }
      if ($process.HasExited) {
        break
      }
    }

    if (-not $ready) {
      throw "The game server did not start. Reopen the project in Codex and try again."
    }
  }

  if (-not $NoBrowser) {
    Start-Process $appUrl
  }
} catch {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show(
    $_.Exception.Message,
    "Game Console",
    [System.Windows.MessageBoxButton]::OK,
    [System.Windows.MessageBoxImage]::Error
  ) | Out-Null
  exit 1
}

