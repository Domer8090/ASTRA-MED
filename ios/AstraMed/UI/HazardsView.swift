import SwiftUI

/// NASA HRP's five hazards of human spaceflight mapped to today's engine output,
/// plus the five body systems ASTRA-MED watches.
struct HazardsView: View {
    @Environment(MissionModel.self) private var model

    var body: some View {
        if let snap = model.snapshot {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Five hazards of human spaceflight")
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(Palette.ink)
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 300), spacing: 12)], spacing: 12) {
                        ForEach(snap.hazards) { h in
                            HazardTile(card: h, info: snap.hazardInfo.first { $0.id == h.id })
                        }
                    }
                    Text("Hazard descriptions follow NASA's Human Research Program. The mapping to body systems is ASTRA-MED's own reading, not a NASA table.")
                        .font(.caption)
                        .foregroundStyle(Palette.ink3)

                    Text("Body systems")
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(Palette.ink)
                        .padding(.top, 8)
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 300), spacing: 12)], spacing: 12) {
                        ForEach(snap.systems) { s in
                            Panel {
                                HStack {
                                    Text(s.name).font(.headline).foregroundStyle(Palette.ink)
                                    Spacer()
                                    StatusBadge(status: s.status)
                                }
                                Text(s.whyItMatters).font(.subheadline).foregroundStyle(Palette.ink2)
                                ForEach(s.observations, id: \.self) { o in
                                    Label(o, systemImage: "eye").font(.caption).foregroundStyle(Palette.ink)
                                }
                                Text(s.recommendedNextStep).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.ink)
                            }
                        }
                    }
                }
                .padding(20)
            }
            .consoleBackground()
            .navigationTitle("Hazards and body systems")
        }
    }
}

private struct HazardTile: View {
    let card: HazardCard
    let info: HazardInfo?

    var body: some View {
        Panel {
            HStack {
                Text(card.name).font(.headline).foregroundStyle(Palette.ink)
                Spacer()
                if let status = card.status { StatusBadge(status: status) }
                if let chip = card.chip {
                    Text(chip)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Palette.cyan)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .overlay(Capsule().strokeBorder(Palette.cyan.opacity(0.5)))
                }
            }
            if let info { Text(info.summary).font(.subheadline).foregroundStyle(Palette.ink2) }
            ForEach(card.facts, id: \.self) { f in
                Text("• \(f)").font(.caption).foregroundStyle(Palette.ink)
            }
            Text(card.note).font(.caption).foregroundStyle(Palette.ink3)
        }
    }
}
