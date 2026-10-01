Add-Type -AssemblyName System.Drawing
$brandDirectory = Join-Path $PSScriptRoot '../src/assets/brand'
$source = [System.Drawing.Image]::FromFile((Join-Path $brandDirectory 'logo.png'))
foreach ($entry in @(@('github-avatar.png', 512), @('favicon-32.png', 32), @('favicon-16.png', 16), @('apple-touch-icon.png', 180))) {
    $size = [int]$entry[1]
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($source, 0, 0, $size, $size)
    $bitmap.Save((Join-Path $brandDirectory $entry[0]), [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}
$social = New-Object System.Drawing.Bitmap 1280, 640
$canvas = [System.Drawing.Graphics]::FromImage($social)
$canvas.Clear([System.Drawing.ColorTranslator]::FromHtml('#112c35'))
$canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$canvas.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$canvas.DrawImage($source, 65, 130, 380, 380)
$titleFont = New-Object System.Drawing.Font 'Segoe UI', 46, ([System.Drawing.FontStyle]::Bold)
$copyFont = New-Object System.Drawing.Font 'Segoe UI', 23
$mint = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#b9e5ca'))
$canvas.DrawString('MockForge Studio', $titleFont, [System.Drawing.Brushes]::White, 470, 200)
$canvas.DrawString('Agree on the form before you build.', $copyFont, $mint, 475, 300)
$canvas.DrawString('Open source / MIT', $copyFont, $mint, 475, 375)
$social.Save((Join-Path $brandDirectory 'github-social.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$titleFont.Dispose()
$copyFont.Dispose()
$mint.Dispose()
$canvas.Dispose()
$social.Dispose()
$source.Dispose()
