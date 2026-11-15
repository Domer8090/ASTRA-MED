import SwiftUI

/// Colour tokens. They mirror `src/config/theme.ts` in the web console.
enum Palette {
    static let space = Color(hex: 0x060B14)
    static let panel = Color(hex: 0x0D1526)
    static let raised = Color(hex: 0x111D31)
    static let line = Color(hex: 0x1D344B)
    static let lineStrong = Color(hex: 0x2A4A68)
    static let ink = Color(hex: 0xE8F0FA)
    static let ink2 = Color(hex: 0x91A4BA)
    static let ink3 = Color(hex: 0x647A93)
    static let cyan = Color(hex: 0x42D9F5)
    static let nominal = Color(hex: 0x22C55E)
    static let caution = Color(hex: 0xF59E0B)
    static let critical = Color(hex: 0xF43F5E)
    static let tue = Color(hex: 0xB9A6FF)
    static let tueDeep = Color(hex: 0x7461D8)
}

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

extension HealthStatus {
    var color: Color {
        switch self {
        case .nominal: Palette.nominal
        case .caution: Palette.caution
        case .critical: Palette.critical
        }
    }

    var symbol: String {
        switch self {
        case .nominal: "checkmark.circle.fill"
        case .caution: "exclamationmark.triangle.fill"
        case .critical: "xmark.octagon.fill"
        }
    }
}

/// Status label: icon plus the exact word. Never colour alone.
struct StatusBadge: View {
    let status: HealthStatus
    var large = false

    var body: some View {
        Label(status.rawValue, systemImage: status.symbol)
            .font(large ? .system(.title3, design: .default).weight(.bold) : .caption.weight(.bold))
            .foregroundStyle(status.color)
            .lineLimit(1)
            .fixedSize()
            .padding(.horizontal, large ? 12 : 8)
            .padding(.vertical, large ? 6 : 3)
            .overlay(Capsule().strokeBorder(status.color.opacity(0.6), lineWidth: 1))
            .accessibilityLabel("Status \(status.rawValue)")
    }
}

/// The synthetic-data label that every data view carries.
struct SyntheticTag: View {
    var body: some View {
        Text("SYNTHETIC")
            .font(.caption2.weight(.bold).monospaced())
            .foregroundStyle(Palette.ink2)
            .lineLimit(1)
            .fixedSize()
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(Palette.lineStrong))
            .accessibilityLabel("Synthetic demonstration data")
    }
}

/// A bordered panel. Elevation is a 1 pt border, no shadow.
struct Panel<Content: View>: View {
    var title: String?
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let title {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(Palette.ink)
            }
            content
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.panel, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.line))
    }
}

/// Why a recommendation exists: indicator, configured rule, provenance and reference.
struct BasisLine: View {
    let basis: Basis

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Basis: \(basis.indicator). \(basis.rule).")
            HStack(spacing: 4) {
                Text("Provenance: \(basis.provenance).")
                if let ref = basis.reference, let url = URL(string: ref.url) {
                    Link(ref.label, destination: url)
                } else {
                    Text(basis.referenceNote)
                }
            }
        }
        .font(.caption)
        .foregroundStyle(Palette.ink3)
    }
}

extension View {
    /// Screen background used by every page.
    func consoleBackground() -> some View {
        scrollContentBackground(.hidden)
            .background(Palette.space.ignoresSafeArea())
    }
}
