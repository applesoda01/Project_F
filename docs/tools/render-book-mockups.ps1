param([string]$OutputDirectory = 'docs/book-v2/src/assets/ui')
# Deterministic planning illustrations, not screenshots of implemented game features.
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$repo = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$out = Join-Path $repo $OutputDirectory
New-Item -ItemType Directory -Force $out | Out-Null
$specs = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'book-mockups.json') | ConvertFrom-Json
$script:fonts = @{}
$script:images = @{}
function Color($hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
function Rect($x,$y,$w,$h,$color) {
    $brush = [System.Drawing.SolidBrush]::new((Color $color))
    $script:g.FillRectangle($brush,[single]$x,[single]$y,[single]$w,[single]$h); $brush.Dispose()
}
function Text($value,$x,$y,$w,$h,$size=22,$color='#4a2e17',$bold=$false) {
    $key = "$size-$bold"
    if (!$script:fonts.ContainsKey($key)) {
        $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
        $script:fonts[$key] = [System.Drawing.Font]::new('Malgun Gothic',[single]$size,$style,[System.Drawing.GraphicsUnit]::Pixel)
    }
    $font = $script:fonts[$key]
    $format = [System.Drawing.StringFormat]::new()
    $format.Trimming = [System.Drawing.StringTrimming]::None
    $measure = $script:g.MeasureString([string]$value,$font,[int]$w,$format)
    if ($measure.Height -gt $h + 2) { throw "Text overflow: $value ($($measure.Height) > $h)" }
    $brush = [System.Drawing.SolidBrush]::new((Color $color))
    $script:g.DrawString([string]$value,$font,$brush,[System.Drawing.RectangleF]::new($x,$y,$w,$h),$format)
    $brush.Dispose(); $format.Dispose()
}
function Picture($relative,$x,$y,$w,$h) {
    if (!$script:images.ContainsKey($relative)) { $script:images[$relative] = [System.Drawing.Image]::FromFile((Join-Path $repo $relative)) }
    $image = $script:images[$relative]
    $scale = [Math]::Min($w/$image.Width,$h/$image.Height)
    $dw = $image.Width*$scale; $dh = $image.Height*$scale
    $script:g.DrawImage($image,[single]($x+($w-$dw)/2),[single]($y+($h-$dh)/2),[single]$dw,[single]$dh)
}
function Column($parts,$x) {
    $y = 248
    foreach($part in $parts) {
        switch($part.kind) {
            'heading' { Text $part.title $x $y 550 40 25 '#6d492c' $true; $y+=48 }
            'card' {
                $fill = if ($part.selected) {'#f3dfb6'} else {'#fff9ec'}
                Rect $x $y 550 100 $fill
                Rect $x $y 5 100 $(if ($part.selected) {'#ae7d24'} else {'#c8b393'})
                $tx=$x+18; $tw=510
                if ($part.image) { Picture $part.image ($x+15) ($y+8) 64 84; $tx=$x+92; $tw=440 }
                Text $part.title $tx ($y+12) $tw 35 24 '#4a2e17' $true
                Text $part.text $tx ($y+52) $tw 40 18 '#78624b'
                $y+=114
            }
            'row' {
                Text $part.title $x $y 245 35 21 '#78624b'
                Text $part.text ($x+245) $y 305 35 22 $(if($part.warning){'#a03835'}else{'#4a2e17'}) $true
                Rect $x ($y+39) 550 1 '#cdbb9a'; $y+=49
            }
            'metric' {
                Rect $x $y 550 87 '#eee0c5'
                Picture 'prototype/assets/ui/hud/icon_coin.png' ($x+14) ($y+20) 42 42
                Text $part.title ($x+70) ($y+12) 450 30 18 '#78624b'
                Text $part.text ($x+70) ($y+40) 450 42 30 '#5c652f' $true; $y+=100
            }
            'note' {
                Rect $x $y 550 70 '#f7e8d5'; Rect $x $y 4 70 '#a03835'
                Text $part.text ($x+15) ($y+10) 520 55 19 '#8b3435'; $y+=84
            }
            'button' {
                $fill = if($part.disabled){'#a79b84'}else{'#8b6b2e'}
                Rect $x $y 550 53 $fill
                Text $part.text ($x+18) ($y+12) 515 35 22 '#fff7e5' $true; $y+=67
            }
        }
        if ($y -gt 925) { throw "Column exceeds book content bounds: $($part.title)" }
    }
}
try {
    foreach($spec in $specs) {
        $bitmap=[System.Drawing.Bitmap]::new(1800,1060)
        $script:g=[System.Drawing.Graphics]::FromImage($bitmap)
        $script:g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $script:g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $script:g.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $script:g.Clear((Color '#27211c'))
        Text $spec.kicker 80 25 1600 40 22 '#d5bd91' $true
        Picture 'prototype/assets/ui/book/book_spread.png' 100 100 1600 879
        $tabs=@('의뢰','리퀘스트','모험가','시설','음식','경영','설정')
        $colors=@('#8e2f3a','#2f7f7a','#b38a26','#566d84','#b0612e','#66763a','#6a4785')
        for($i=0;$i -lt $tabs.Count;$i++) {
            $tx=if($tabs[$i] -eq $spec.active){38}else{56}
            Rect $tx (210+$i*82) 142 67 $colors[$i]
            Text $tabs[$i] ($tx+8) (228+$i*82) 135 35 20 '#fff5de' $true
        }
        Text $spec.leftTitle 270 170 550 48 32 '#4a2e17' $true
        Text $spec.rightTitle 960 170 550 48 32 '#4a2e17' $true
        Rect 270 225 550 2 '#bba178'; Rect 960 225 550 2 '#bba178'
        Column $spec.left 270
        Column $spec.right 960
        Text '기획 시안 · 게임 미구현 · 인물/수치/거래는 설명용 예시' 250 998 1400 35 20 '#d5bd91'
        $codec=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
        $parameters=[System.Drawing.Imaging.EncoderParameters]::new(1)
        $parameters.Param[0]=[System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality,[long]94)
        $bitmap.Save((Join-Path $out ($spec.id+'.jpg')),$codec,$parameters)
        $parameters.Dispose(); $script:g.Dispose(); $bitmap.Dispose()
        Write-Output "Rendered $($spec.id).jpg"
    }
} finally {
    foreach($font in $script:fonts.Values){$font.Dispose()}
    foreach($image in $script:images.Values){$image.Dispose()}
}
