# Encaminha para o script de deploy atualizado (deploy.ps1)
# Uso: powershell -ExecutionPolicy Bypass -File build-deploy.ps1
& "$PSScriptRoot\deploy.ps1" @args
