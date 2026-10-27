$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
$Jar = Join-Path $ProjectRoot "backend/finance-api/target/finance-api-1.0.0.jar"
$Web = Join-Path $ProjectRoot "frontend/dist"
if (!(Test-Path $Jar) -or !(Test-Path "$Web/index.html")) {
    throw "Build first: pnpm --dir frontend install --frozen-lockfile; pnpm --dir frontend build; mvn -f backend/pom.xml verify"
}
$AppPort = if ($env:PORT) { $env:PORT } else { "8080" }
$StaticPath = $Web.Replace("\", "/")
$Runtime = Join-Path $ProjectRoot ".runtime"
New-Item -ItemType Directory -Force -Path $Runtime | Out-Null
$RunningJar = Join-Path $Runtime "homewise.jar"
Copy-Item $Jar $RunningJar -Force
Write-Host "Homewise: http://localhost:$AppPort (Ctrl+C to stop)"
& java -jar $RunningJar "--server.port=$AppPort" "--server.address=0.0.0.0" "--spring.web.resources.static-locations=file:$StaticPath/"
exit $LASTEXITCODE
