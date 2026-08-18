# Sync candidate TSV -> PPTX (preserves exec summary layout on slide 2)
$ErrorActionPreference = 'Stop'
$pptPath = 'c:\Users\jshepherd\Excel Sports Management\Nolan Partners - Documents\Nolan Shared\North America\Active Clients\Sac. Kings\2025 - VP Stadium Ops\Search Updates\Search Update Report - Director, Stadium Ops - Sac River Cats (ESA2026).pptx'
$tsvPath = Join-Path $PSScriptRoot 'candidates-data.tsv'
$rowsPerSlide = 10
$firstCandidateSlide = 3
$templateSlide = 4

function Normalize-Url([string]$url) {
    if ([string]::IsNullOrWhiteSpace($url)) { return '' }
    $u = $url.Trim()
    if ($u -notmatch '^https?://') { $u = 'https://' + $u.TrimStart('/') }
    return $u
}

function Normalize-Status([string]$status) {
    if ([string]::IsNullOrWhiteSpace($status)) { return '' }
    $s = $status.Trim()
    if ($s -match '(?i)^unresponsive$') { return 'Unresponsive' }
    if ($s -match '(?i)^declined interest$') { return 'Declined Interest' }
    return $s
}

function Get-TableShape($slide) {
    $best = $null
    $bestRows = 0
    for ($i = 1; $i -le $slide.Shapes.Count; $i++) {
        $sh = $slide.Shapes.Item($i)
        if ($sh.HasTable -and $sh.Table.Rows.Count -gt $bestRows) {
            $best = $sh
            $bestRows = $sh.Table.Rows.Count
        }
    }
    return $best
}

function Set-RoleCell($cell, [string]$title, [string]$company) {
    $rng = $cell.Shape.TextFrame.TextRange
    $text = if ([string]::IsNullOrWhiteSpace($company)) { $title } else { "$title`r$company" }
    $rng.Text = $text
    try {
        if ($rng.Paragraphs().Count -ge 2) {
            $rng.Paragraphs(2).Font.Italic = $true
        }
    } catch {}
}

function Set-NameWithLink($cell, [string]$name, [string]$url) {
    $rng = $cell.Shape.TextFrame.TextRange
    $rng.Text = $name
    if (-not [string]::IsNullOrWhiteSpace($url)) {
        try {
            $rng.ActionSettings.Item(1).Action = 7 # ppActionHyperlink
            $rng.ActionSettings.Item(1).Hyperlink.Address = $url
        } catch {}
    }
}

$candidates = @()
Get-Content -LiteralPath $tsvPath -Encoding UTF8 | ForEach-Object {
    if ([string]::IsNullOrWhiteSpace($_)) { return }
    $p = $_ -split "`t", 5
    if ($p.Count -lt 5) { return }
    $candidates += [pscustomobject]@{
        Name    = $p[0].Trim()
        Title   = $p[1].Trim()
        Company = $p[2].Trim()
        Url     = (Normalize-Url $p[3])
        Status  = (Normalize-Status $p[4])
    }
}

$counts = @{}
foreach ($c in $candidates) {
    $st = $c.Status
    if (-not $counts.ContainsKey($st)) { $counts[$st] = 0 }
    $counts[$st]++
}
function C([string]$k) { if ($counts.ContainsKey($k)) { [int]$counts[$k] } else { 0 } }

$pptApp = New-Object -ComObject PowerPoint.Application
$pres = $pptApp.Presentations.Open($pptPath, $false, $true, $false)
try { $pptApp.DisplayAlerts = 1 } catch {} # ppAlertsNone

# Ensure enough candidate slides
$neededSlides = [Math]::Ceiling($candidates.Count / [double]$rowsPerSlide)
$currentCandSlides = $pres.Slides.Count - ($firstCandidateSlide - 1)
while ($currentCandSlides -lt $neededSlides) {
    $pres.Slides.Item($templateSlide).Duplicate() | Out-Null
    # Move duplicate to end
    $dup = $pres.Slides.Item($templateSlide + 1)
    $dup.MoveTo($pres.Slides.Count)
    $currentCandSlides++
}

# Fill candidate tables
$idx = 0
for ($s = $firstCandidateSlide; $s -le $pres.Slides.Count; $s++) {
    $slide = $pres.Slides.Item($s)
    $shape = Get-TableShape $slide
    if (-not $shape) { continue }
    $tbl = $shape.Table

    # Ensure enough rows (header + 10)
    while ($tbl.Rows.Count -lt ($rowsPerSlide + 1)) {
        $tbl.Rows.Add() | Out-Null
    }

    for ($r = 2; $r -le ($rowsPerSlide + 1); $r++) {
        if ($idx -lt $candidates.Count) {
            $c = $candidates[$idx]
            Set-NameWithLink $tbl.Cell($r, 1) $c.Name $c.Url
            Set-RoleCell $tbl.Cell($r, 2) $c.Title $c.Company
            $tbl.Cell($r, 3).Shape.TextFrame.TextRange.Text = $c.Status
            $idx++
        } else {
            $tbl.Cell($r, 1).Shape.TextFrame.TextRange.Text = ''
            $tbl.Cell($r, 2).Shape.TextFrame.TextRange.Text = ''
            $tbl.Cell($r, 3).Shape.TextFrame.TextRange.Text = ''
        }
    }
}

# Exec summary slide 2
$exec = $pres.Slides.Item(2)
$tbl2Shape = Get-TableShape $exec
if ($tbl2Shape) {
    $tbl2 = $tbl2Shape.Table
    $metricMap = [ordered]@{
        'Total Candidates'           = $candidates.Count
        'Unresponsive'               = (C 'Unresponsive')
        'Declined Interest'          = (C 'Declined Interest')
        'Cannot Relocate'            = (C 'Cannot Relocate')
        'Candidate Withdrew'         = (C 'Candidate Withdrew')
        'Declined Offer'             = (C 'Declined Offer')
        'Rejected by Client'         = (C 'Rejected by Client')
        'Rejected by Excel Search'   = (C 'Rejected by Excel Search')
        'Presenting to client'       = (C 'Presenting to client')
        'Scheduled w/ Excel Search'  = (C 'Scheduled w/ Excel Search')
    }
    for ($r = 1; $r -le $tbl2.Rows.Count; $r++) {
        $label = (($tbl2.Cell($r, 1).Shape.TextFrame.TextRange.Text) -replace "[\r\n\v]", '').Trim()
        foreach ($key in $metricMap.Keys) {
            if ($label -match [regex]::Escape($key)) {
                try { $tbl2.Cell($r, 2).Shape.TextFrame.TextRange.Text = [string]$metricMap[$key] } catch {}
            }
        }
    }
}

$pres.Save()
$pres.Close()
$pptApp.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($pres) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($pptApp) | Out-Null
[System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers()

Write-Host "Saved. Candidates synced=$($candidates.Count) Unresponsive=$(C 'Unresponsive') Total=$($candidates.Count)"
