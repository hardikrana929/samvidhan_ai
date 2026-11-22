param(
  [string]$PdfPath = "data/constitution-official.pdf",
  [string]$TextPath = "data/constitution.txt"
)
$ErrorActionPreference = "Stop"
$pdftotext = Get-Command pdftotext -ErrorAction SilentlyContinue
if (-not $pdftotext) {
  Write-Error "pdftotext was not found. Install Poppler for Windows and add its Library/bin folder to PATH, then reopen PowerShell. No Python or WSL is required."
}
if (-not (Test-Path $PdfPath)) { Write-Error "PDF not found: $PdfPath" }
& $pdftotext.Source -layout $PdfPath $TextPath
if ($LASTEXITCODE -ne 0) { Write-Error "pdftotext failed with exit code $LASTEXITCODE" }
node tools/import-constitution.mjs $TextPath $PdfPath
