// Génère les icônes des applications mobiles LanfiaSave (bouclier + pousse).
// Usage : swift make-icons.swift <dossier assets> <couleur hex de fond> <couleur hex d'accent>
import AppKit
import CoreGraphics

let args = CommandLine.arguments
let outDir = args[1]
let bgHex = args[2]
let accentHex = args[3]

func color(_ hex: String, _ alpha: CGFloat = 1) -> CGColor {
    let v = Int(hex.dropFirst(), radix: 16)!
    return CGColor(red: CGFloat((v >> 16) & 0xFF) / 255, green: CGFloat((v >> 8) & 0xFF) / 255,
                   blue: CGFloat(v & 0xFF) / 255, alpha: alpha)
}

/// Dessine le logo dans un carré de côté `side`, centré en (cx, cy) ; coordonnées du dessin en 40×40.
func drawLogo(_ ctx: CGContext, cx: CGFloat, cy: CGFloat, side: CGFloat, shield: CGColor, mark: CGColor, dot: CGColor) {
    ctx.saveGState()
    let k = side / 40
    ctx.translateBy(x: cx - side / 2, y: cy + side / 2)
    ctx.scaleBy(x: k, y: -k)  // repère SVG (y vers le bas)

    let s = CGMutablePath()
    s.move(to: CGPoint(x: 20, y: 3))
    s.addLine(to: CGPoint(x: 6, y: 8.5))
    s.addLine(to: CGPoint(x: 6, y: 18.7))
    s.addCurve(to: CGPoint(x: 20, y: 37), control1: CGPoint(x: 6, y: 27.4), control2: CGPoint(x: 12, y: 34.6))
    s.addCurve(to: CGPoint(x: 34, y: 18.7), control1: CGPoint(x: 28, y: 34.6), control2: CGPoint(x: 34, y: 27.4))
    s.addLine(to: CGPoint(x: 34, y: 8.5))
    s.closeSubpath()
    ctx.addPath(s)
    ctx.setFillColor(shield)
    ctx.fillPath()

    ctx.setStrokeColor(mark)
    ctx.setLineWidth(2.2)
    ctx.setLineCap(.round)
    ctx.setLineJoin(.round)
    let p = CGMutablePath()
    p.move(to: CGPoint(x: 20, y: 29))
    p.addLine(to: CGPoint(x: 20, y: 17))
    p.addCurve(to: CGPoint(x: 27, y: 10.5), control1: CGPoint(x: 20, y: 13), control2: CGPoint(x: 23, y: 10.5))
    p.addCurve(to: CGPoint(x: 20, y: 17), control1: CGPoint(x: 27, y: 14.5), control2: CGPoint(x: 24, y: 17))
    p.move(to: CGPoint(x: 20, y: 20))
    p.addCurve(to: CGPoint(x: 14.4, y: 14.8), control1: CGPoint(x: 20, y: 16.8), control2: CGPoint(x: 17.6, y: 14.8))
    p.addCurve(to: CGPoint(x: 20, y: 20), control1: CGPoint(x: 14.4, y: 18), control2: CGPoint(x: 16.8, y: 20))
    ctx.addPath(p)
    ctx.strokePath()

    ctx.setFillColor(dot)
    ctx.fillEllipse(in: CGRect(x: 18.4, y: 28.9, width: 3.2, height: 3.2))
    ctx.restoreGState()
}

func render(_ name: String, size: Int, draw: (CGContext, CGFloat) -> Void) {
    let cs = CGColorSpace(name: CGColorSpace.sRGB)!
    let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    draw(ctx, CGFloat(size))
    let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(outDir)/\(name)"))
}

let white = color("#FFFFFF")
let bg = color(bgHex)
let accent = color(accentHex)
let gold = color("#C9A227")

// Icône iOS / générique : fond plein, logo blanc avec pousse colorée.
render("icon.png", size: 1024) { ctx, n in
    ctx.setFillColor(bg); ctx.fill(CGRect(x: 0, y: 0, width: n, height: n))
    drawLogo(ctx, cx: n / 2, cy: n / 2, side: n * 0.62, shield: white, mark: bg, dot: gold)
}
// Écran de démarrage : logo blanc sur fond transparent (le fond est défini dans app.json).
render("splash-icon.png", size: 1024) { ctx, n in
    drawLogo(ctx, cx: n / 2, cy: n / 2, side: n * 0.8, shield: white, mark: bg, dot: gold)
}
// Android adaptatif : premier plan dans la zone sûre (66 %), fond plein, monochrome.
render("android-icon-foreground.png", size: 512) { ctx, n in
    drawLogo(ctx, cx: n / 2, cy: n / 2, side: n * 0.5, shield: white, mark: bg, dot: gold)
}
render("android-icon-background.png", size: 512) { ctx, n in
    ctx.setFillColor(bg); ctx.fill(CGRect(x: 0, y: 0, width: n, height: n))
    ctx.setFillColor(accent); ctx.fillEllipse(in: CGRect(x: n * 0.55, y: -n * 0.25, width: n * 0.8, height: n * 0.8))
}
render("android-icon-monochrome.png", size: 432) { ctx, n in
    drawLogo(ctx, cx: n / 2, cy: n / 2, side: n * 0.5, shield: white, mark: CGColor(gray: 0, alpha: 0), dot: white)
}
render("favicon.png", size: 48) { ctx, n in
    ctx.setFillColor(bg); ctx.fill(CGRect(x: 0, y: 0, width: n, height: n))
    drawLogo(ctx, cx: n / 2, cy: n / 2, side: n * 0.8, shield: white, mark: bg, dot: gold)
}
print("Icônes générées dans \(outDir)")
