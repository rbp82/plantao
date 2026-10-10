<#
.SYNOPSIS
    Script de build e deploy do Plantao (PWA).

.DESCRIPTION
    Executa verificacao de tipos, suite de testes Vitest, compilacao do app React 19 (web/)
    com Vite e empacotamento do app legado + protocolos em uma pasta de deploy pronta para o GitHub Pages.
    Opcionalmente realiza commit e push caso o Git esteja configurado.

.PARAMETER SkipTests
    Pula a execucao dos testes automatizados (vitest).

.PARAMETER SkipTypecheck
    Pula a verificacao de tipos do TypeScript (tsc --noEmit).

.PARAMETER OutputDir
    Diretorio de saida para os arquivos de publicacao. Padrao: 'deploy/github-pages'.

.PARAMETER Commit
    Se habilitado e o Git estiver disponivel, cria um commit com as alteracoes da build.

.PARAMETER Push
    Se habilitado e o Git estiver disponivel, faz commit e push para o repositorio remoto.

.PARAMETER Message
    Mensagem personalizada para o commit Git (padrao: 'deploy: v<versao> - <data/hora>').

.EXAMPLE
    .\deploy.ps1
    Executa testes, typecheck, build e gera deploy/github-pages com legado e protocolos.

.EXAMPLE
    .\deploy.ps1 -SkipTests
    Gera o pacote de deploy sem rodar a suite de testes.

.EXAMPLE
    .\deploy.ps1 -Push -Message "Atualiza calculadoras de sedacao"
    Executa o ciclo completo e envia para o GitHub.
#>

[CmdletBinding()]
param(
    [switch]$SkipTests,
    [switch]$SkipTypecheck,
    [string]$OutputDir = '',
    [switch]$Commit,
    [switch]$Push,
    [string]$Message = ''
)

$ErrorActionPreference = 'Stop'
$swTimer = [System.Diagnostics.Stopwatch]::StartNew()

$rootDir = $PSScriptRoot
$webDir = Join-Path $rootDir 'web'

if (-not (Test-Path $webDir)) {
    Write-Error "Diretorio 'web' nao encontrado em $rootDir."
    exit 1
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $rootDir 'deploy\github-pages'
} elseif (-not [System.IO.Path]::IsPathRooted($OutputDir)) {
    $OutputDir = Join-Path $rootDir $OutputDir
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   >>> INICIANDO PROCESSO DE DEPLOY - PLANTAO (PWA)   " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Raiz do projeto : $rootDir" -ForegroundColor DarkGray
Write-Host "Pasta de destino: $OutputDir" -ForegroundColor DarkGray
Write-Host ""

# 1. Funcao auxiliar para executar comandos npm
function Invoke-NpmCommand([string]$npmArgs, [string]$workingDir) {
    $prevDir = Get-Location
    try {
        Set-Location $workingDir
        $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm.cmd $npmArgs" -NoNewWindow -PassThru -Wait
        if ($process.ExitCode -ne 0) {
            throw "Comando 'npm $npmArgs' falhou com codigo de saida $($process.ExitCode)."
        }
    }
    finally {
        Set-Location $prevDir
    }
}

# 2. Verificacao de Tipos (TypeScript)
if (-not $SkipTypecheck) {
    Write-Host "[1/5] Verificando tipos TypeScript (tsc)..." -ForegroundColor Yellow
    Invoke-NpmCommand "run typecheck" $webDir
    Write-Host "      [OK] Tipos conferidos com sucesso!" -ForegroundColor Green
} else {
    Write-Host "[1/5] [PULADO] Verificacao de tipos ignorada (-SkipTypecheck)." -ForegroundColor DarkGray
}

# 3. Execucao dos Testes Automatizados (Vitest)
if (-not $SkipTests) {
    Write-Host "[2/5] Executando testes unitarios (vitest)..." -ForegroundColor Yellow
    Invoke-NpmCommand "test" $webDir
    Write-Host "      [OK] Todos os testes passaram com sucesso!" -ForegroundColor Green
} else {
    Write-Host "[2/5] [PULADO] Testes automatizados ignorados (-SkipTests)." -ForegroundColor DarkGray
}

# 4. Build de Producao (Vite + Postbuild)
Write-Host "[3/5] Compilando aplicacao web e gerando PWA..." -ForegroundColor Yellow
Invoke-NpmCommand "run build" $webDir
Write-Host "      [OK] Build do Vite e pos-processamento concluidos!" -ForegroundColor Green

$distDir = Join-Path $webDir 'dist'
if (-not (Test-Path $distDir)) {
    throw "Diretorio de build 'web/dist' nao foi encontrado apos compilacao."
}

# 5. Sincronizacao para a pasta de publicacao (OutputDir)
Write-Host "[4/5] Organizando artefatos em '$OutputDir'..." -ForegroundColor Yellow

if (Test-Path $OutputDir) {
    Get-ChildItem -Path $OutputDir -Force | Where-Object { $_.Name -ne '.git' } | Remove-Item -Recurse -Force
} else {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Get-ChildItem -Path $distDir -Force | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $OutputDir -Recurse -Force
}

$protocolosSrc = Join-Path $rootDir 'protocolos'
if (Test-Path $protocolosSrc) {
    $protocolosDst = Join-Path $OutputDir 'protocolos'
    Copy-Item -Path $protocolosSrc -Destination $protocolosDst -Recurse -Force
    Write-Host "      [OK] Protocolos copiados para deploy/protocolos/." -ForegroundColor Green
}

# 6. Validacao de Sanidade do Pacote
$requiredFiles = @(
    'index.html',
    'manifest.webmanifest',
    'sw.js',
    '.nojekyll',
    'legado\index.html',
    'legado\sw.js'
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    $checkPath = Join-Path $OutputDir $file
    if (-not (Test-Path $checkPath)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    throw "Validacao falhou! Arquivos obrigatorios ausentes no deploy: $($missingFiles -join ', ')"
}

$pkgJsonPath = Join-Path $webDir 'package.json'
$appVersion = "v4.0.0"
if (Test-Path $pkgJsonPath) {
    $pkgContent = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
    $appVersion = "v$($pkgContent.version)"
}

$allFiles = Get-ChildItem -Path $OutputDir -Recurse -File
$totalSize = ($allFiles | Measure-Object -Property Length -Sum).Sum / 1MB
$swTimer.Stop()

Write-Host "[5/5] [OK] Validacao e empacotamento concluidos!" -ForegroundColor Green

# 7. Git Opcional (Commit / Push)
$gitCmd = Get-Command "git" -ErrorAction SilentlyContinue
if (($Commit -or $Push) -and $gitCmd) {
    Write-Host ""
    Write-Host "Executando acoes do Git..." -ForegroundColor Yellow
    if ([string]::IsNullOrWhiteSpace($Message)) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
        $Message = "deploy: $appVersion ($timestamp)"
    }

    & git add -A
    $status = (& git status --porcelain)
    if ($status) {
        & git commit -m "$Message"
    }
    if ($Push) {
        $currentBranch = (& git branch --show-current).Trim()
        Write-Host "   Enviando branch principal ($currentBranch)..." -ForegroundColor Yellow
        $hasUpstream = (& git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null)
        if (-not $hasUpstream) {
            & git push -u origin $currentBranch
        } else {
            & git push
        }
    }
    Write-Host "   [OK] Operacoes Git concluidas com sucesso!" -ForegroundColor Green
} elseif ($Commit -or $Push) {
    Write-Host "[AVISO] 'git' nao foi encontrado no PATH do sistema. Commit/Push nao executado." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "   DEPLOY CONCLUIDO COM SUCESSO! ($appVersion)        " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ("Arquivos gerados : {0}" -f $allFiles.Count) -ForegroundColor White
Write-Host ("Tamanho total    : {0:N2} MB" -f $totalSize) -ForegroundColor White
Write-Host ("Tempo decorrido  : {0:N2} s" -f $swTimer.Elapsed.TotalSeconds) -ForegroundColor White
Write-Host ("Local dos arquivos: {0}" -f $OutputDir) -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
