param(
  [Parameter(Mandatory = $true)]
  [string]$DockerHubUser,
  [string]$SshTarget,
  [string]$RemoteDir = "/var/www/DroplyProject/droply",
  [string]$ImageTag = "latest",
  [string]$PublicAppUrl = "https://droply.dhyey2075.fun"
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$env:DOCKERHUB_USER = $DockerHubUser
$env:IMAGE_TAG = $ImageTag
$env:NEXT_PUBLIC_APP_URL = $PublicAppUrl

$webImage = "${DockerHubUser}/droply-web:${ImageTag}"
$ragImage = "${DockerHubUser}/droply-rag:${ImageTag}"

Write-Host "Logging in to Docker Hub (if needed)"
docker login
if ($LASTEXITCODE -ne 0) { throw "docker login failed" }

Write-Host "Building $webImage and $ragImage (NEXT_PUBLIC_APP_URL=$PublicAppUrl)"
docker compose build web rag
if ($LASTEXITCODE -ne 0) { throw "docker compose build failed" }

Write-Host "Pushing $webImage and $ragImage"
docker compose push web rag
if ($LASTEXITCODE -ne 0) { throw "docker compose push failed" }

if (-not $SshTarget) {
  Write-Host @"
Pushed. On the VPS:

  cd $RemoteDir
  # add to .env if missing:
  #   DOCKERHUB_USER=$DockerHubUser
  #   IMAGE_TAG=$ImageTag
  docker compose -f docker-compose.yml -f docker-compose.vps.yml pull
  docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d
"@
  exit 0
}

Write-Host "Copying compose files to $SshTarget"
scp .\docker-compose.yml .\docker-compose.vps.yml .\Caddyfile "${SshTarget}:${RemoteDir}/"
if ($LASTEXITCODE -ne 0) { throw "scp compose files failed" }

Write-Host "Pulling images on VPS and starting stack"
ssh $SshTarget @"
set -e
cd $RemoteDir
if grep -q '^DOCKERHUB_USER=' .env 2>/dev/null; then
  sed -i 's/^DOCKERHUB_USER=.*/DOCKERHUB_USER=$DockerHubUser/' .env
else
  echo 'DOCKERHUB_USER=$DockerHubUser' >> .env
fi
if grep -q '^IMAGE_TAG=' .env 2>/dev/null; then
  sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=$ImageTag/' .env
else
  echo 'IMAGE_TAG=$ImageTag' >> .env
fi
if docker compose version >/dev/null 2>&1; then
  COMPOSE='docker compose'
else
  COMPOSE='docker-compose'
fi
`$COMPOSE -f docker-compose.yml -f docker-compose.vps.yml pull
`$COMPOSE -f docker-compose.yml -f docker-compose.vps.yml up -d
`$COMPOSE -f docker-compose.yml -f docker-compose.vps.yml ps
"@
if ($LASTEXITCODE -ne 0) { throw "remote pull/up failed" }

Write-Host "Done. App should be at $PublicAppUrl"
