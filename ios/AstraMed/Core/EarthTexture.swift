import CoreGraphics
import Foundation
import ImageIO

/// Builds the Earth texture for one instant: NASA Blue Marble on the day side,
/// NASA city lights on the night side, with a soft terminator around the
/// subsolar point. Same model as the web console's globe shader, done once on
/// the CPU so it needs no custom shader. Runs off the main thread.
enum EarthTexture {
    static let width = 2048
    static let height = 1024

    static func make(sunLat: Double, sunLon: Double) -> CGImage? {
        guard let day = pixels(named: "blue-marble"), let night = pixels(named: "city-lights") else { return nil }
        let w = width, h = height
        var out = [UInt8](repeating: 255, count: w * h * 4)
        let rad = Double.pi / 180
        let sLat = sunLat * rad, sLon = sunLon * rad
        let sinS = sin(sLat), cosS = cos(sLat)
        // Longitude terms per column, latitude terms per row.
        var cosD = [Double](repeating: 0, count: w)
        for x in 0..<w {
            let lon = (Double(x) + 0.5) / Double(w) * 360 - 180
            cosD[x] = cos(lon * rad - sLon)
        }
        for y in 0..<h {
            let lat = 90 - (Double(y) + 0.5) / Double(h) * 180
            let sinL = sin(lat * rad), cosL = cos(lat * rad)
            for x in 0..<w {
                // Cosine of the angle between this point and the subsolar point.
                let c = sinL * sinS + cosL * cosS * cosD[x]
                // Day weight with a twilight band about 6° wide.
                let t = min(1, max(0, (c + 0.1) / 0.2))
                let dayW = t * t * (3 - 2 * t)
                let i = (y * w + x) * 4
                for k in 0..<3 {
                    let d = Double(day[i + k])
                    let n = Double(night[i + k])
                    // Night side: dim Blue Marble plus warm city lights.
                    let warm = k == 0 ? 1.0 : (k == 1 ? 0.85 : 0.6)
                    let nightValue = d * 0.08 + n * 0.9 * warm
                    let v = dayW * d * 1.05 + (1 - dayW) * nightValue
                    out[i + k] = UInt8(max(0, min(255, v)))
                }
            }
        }
        let provider = CGDataProvider(data: Data(out) as CFData)
        return provider.flatMap {
            CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: w * 4,
                    space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipLast.rawValue),
                    provider: $0, decode: nil, shouldInterpolate: true, intent: .defaultIntent)
        }
    }

    /// Decodes a bundled JPEG into RGBA bytes at the working size.
    private static func pixels(named name: String) -> [UInt8]? {
        guard let url = Bundle.main.url(forResource: name, withExtension: "jpg"),
              let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { return nil }
        var buffer = [UInt8](repeating: 0, count: width * height * 4)
        let ok = buffer.withUnsafeMutableBytes { raw -> Bool in
            guard let ctx = CGContext(data: raw.baseAddress, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
                                      space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { return false }
            ctx.interpolationQuality = .high
            ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
            return true
        }
        return ok ? buffer : nil
    }
}
