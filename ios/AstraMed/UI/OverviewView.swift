import SwiftUI

struct OverviewView: View {
    @Environment(MissionModel.self) private var model
    @Environment(\.openSection) private var openSection
    @Environment(\.openContact) private var openContact

    var body: some View {
        if let snap = model.snapshot {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    TuesdayDashboardCard(reply: snap.tuesday.messages.last(where: { $0.role == "tuesday" })?.text)
                    StatusHeader(snap: snap)
                    MissionTrack(snap: snap)
                    ViewThatFits(in: .horizontal) {
                        HStack(alignment: .top, spacing: 16) {
                            NextActionPanel(snap: snap).frame(maxWidth: .infinity)
                            ReadinessPanel(readiness: snap.readiness).frame(width: 300)
                        }
                        VStack(spacing: 16) {
                            NextActionPanel(snap: snap)
                            ReadinessPanel(readiness: snap.readiness)
                        }
                    }
                    MetricGrid(metrics: snap.metrics)
                    if !snap.advisories.filter({ $0.level != "ALL CLEAR" }).isEmpty {
                        AdvisoryPanel(advisories: snap.advisories.filter { $0.level != "ALL CLEAR" })
                    }
                    EarlyWarningPanel(snap: snap)
                    Text(snap.disclaimer)
                        .font(.caption)
                        .foregroundStyle(Palette.ink3)
                }
                .padding(20)
            }
            .consoleBackground()
            .navigationTitle("Overview")
            .navigationDestination(for: String.self) { id in MetricDetailView(metricId: id) }
            .refreshable { await model.refresh() }
        }
    }
}

private struct TuesdayDashboardCard: View {
    @Environment(\.openSection) private var openSection
    let reply: String?

    var body: some View {
        Panel {
            HStack(alignment: .center, spacing: 14) {
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .font(.title2)
                    .foregroundStyle(Palette.tue)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    Text("TUESDAY · ONBOARD COMPANION")
                        .font(.headline)
                        .foregroundStyle(Palette.ink)
                    Text(reply ?? "Ask Tuesday about today’s readings, trends, or a wellbeing check-in.")
                        .font(.subheadline)
                        .foregroundStyle(Palette.ink2)
                        .lineLimit(2)
                    Text("On-device guidance · conversation stays on this device")
                        .font(.caption)
                        .foregroundStyle(Palette.ink3)
                }
                Spacer(minLength: 8)
                Button("Open Tuesday", systemImage: "bubble.left.and.bubble.right.fill") {
                    openSection(.tuesday)
                }
                .buttonStyle(.borderedProminent)
                .tint(Palette.tueDeep)
                .controlSize(.large)
            }
        }
    }
}

private struct StatusHeader: View {
    let snap: Snapshot
    @Environment(\.openContact) private var openContact

    var body: some View {
        Panel {
            HStack(alignment: .center, spacing: 16) {
                Image(systemName: snap.overall.status.symbol)
                    .font(.system(size: 44))
                    .foregroundStyle(snap.overall.status.color)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text("Overall").font(.title2.weight(.semibold)).foregroundStyle(Palette.ink)
                        StatusBadge(status: snap.overall.status, large: true)
                        SyntheticTag()
                    }
                    Text(countsText)
                        .font(.subheadline)
                        .foregroundStyle(Palette.ink2)
                    Text("Mission day \(snap.day) · \(snap.shipTime) ship time (UTC) · signal delay \(String(format: "%.1f", snap.signalDelayMinutes)) min")
                        .font(.subheadline.monospacedDigit())
                        .foregroundStyle(Palette.ink2)
                    Text("Scenario \(snap.scenario.code): \(snap.scenario.name). \(snap.mission.crewLabel).")
                        .font(.caption)
                        .foregroundStyle(Palette.ink3)
                    if snap.overall.status == .critical {
                        Button("Contact medical officer", systemImage: "cross.case.fill") { openContact("urgent") }
                            .buttonStyle(.borderedProminent)
                            .tint(Palette.critical)
                            .padding(.top, 4)
                    }
                }
                Spacer(minLength: 0)
            }
        }
    }

    private var countsText: String {
        let c = snap.overall.counts
        var parts = ["\(c["NOMINAL"] ?? 0) nominal", "\(c["CAUTION"] ?? 0) caution", "\(c["CRITICAL"] ?? 0) critical"]
        if snap.overall.advisoryCount > 0 { parts.append("\(snap.overall.advisoryCount) environmental advisory") }
        return parts.joined(separator: ", ") + "."
    }
}

/// 180 mission days coloured by the engine's daily status. Drag or tap to replay a day.
private struct MissionTrack: View {
    let snap: Snapshot
    @Environment(MissionModel.self) private var model
    @State private var dragDay: Int?

    var body: some View {
        Panel(title: "Mission track") {
            GeometryReader { geo in
                let total = max(1, snap.dayStatus.count)
                let w = geo.size.width / CGFloat(total)
                ZStack(alignment: .leading) {
                    HStack(spacing: 0) {
                        ForEach(Array(snap.dayStatus.enumerated()), id: \.offset) { i, status in
                            Rectangle()
                                .fill(i + 1 <= snap.day ? status.color.opacity(status == .nominal ? 0.35 : 0.9) : Palette.line)
                                .frame(width: w)
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    Rectangle()
                        .fill(Palette.ink)
                        .frame(width: 2, height: 34)
                        .offset(x: CGFloat((dragDay ?? snap.day) - 1) * w + w / 2 - 1)
                }
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { v in dragDay = day(at: v.location.x, width: geo.size.width, total: total) }
                        .onEnded { v in
                            let d = day(at: v.location.x, width: geo.size.width, total: total)
                            dragDay = nil
                            Task { await model.setDay(d) }
                        }
                )
            }
            .frame(height: 34)
            .accessibilityElement()
            .accessibilityLabel("Mission day \(snap.day) of \(snap.mission.totalDays)")
            .accessibilityValue(snap.dayStatus[safe: snap.day - 1]?.rawValue ?? "")
            .accessibilityAdjustableAction { direction in
                let next = direction == .increment ? snap.day + 1 : snap.day - 1
                Task { await model.setDay(min(snap.mission.totalDays, max(1, next))) }
            }
            HStack {
                Text("Day 1").font(.caption.monospaced())
                Spacer()
                Text("Showing day \(dragDay ?? snap.day)").font(.caption.monospaced().weight(.semibold))
                Spacer()
                Text("Day \(snap.mission.totalDays)").font(.caption.monospaced())
            }
            .foregroundStyle(Palette.ink2)
            Picker("Scenario", selection: Binding(
                get: { snap.settings.scenarioId },
                set: { id in Task { await model.perform("setScenario", ["scenarioId": id]) } }
            )) {
                ForEach(snap.scenarios) { s in Text("\(s.code): \(s.name)").tag(s.id) }
            }
            .pickerStyle(.segmented)
        }
    }

    private func day(at x: CGFloat, width: CGFloat, total: Int) -> Int {
        min(total, max(1, Int(x / max(1, width) * CGFloat(total)) + 1))
    }
}

private struct NextActionPanel: View {
    let snap: Snapshot
    @Environment(\.openSection) private var openSection

    var body: some View {
        Panel(title: "Most important next action") {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: snap.primaryAction.severity.symbol)
                    .foregroundStyle(snap.primaryAction.severity.color)
                    .accessibilityHidden(true)
                Text(snap.primaryAction.text)
                    .font(.body)
                    .foregroundStyle(Palette.ink)
            }
            HStack {
                Button("Countermeasures", systemImage: "checklist") { openSection(.countermeasures) }
                Button("Log a reading", systemImage: "square.and.pencil") { openSection(.log) }
            }
            .buttonStyle(.bordered)
        }
    }
}

struct ReadinessPanel: View {
    let readiness: Readiness

    var body: some View {
        Panel(title: "Readiness") {
            HStack(spacing: 16) {
                ZStack {
                    Circle().stroke(Palette.line, lineWidth: 10)
                    Circle()
                        .trim(from: 0, to: CGFloat(readiness.score) / 100)
                        .stroke(Palette.cyan, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    Text("\(readiness.score)")
                        .font(.title.monospacedDigit().weight(.bold))
                        .foregroundStyle(Palette.ink)
                }
                .frame(width: 88, height: 88)
                .accessibilityElement()
                .accessibilityLabel("Readiness score \(readiness.score) of 100")
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(readiness.completedTasks) of \(readiness.totalTasks) tasks today")
                    Text("\(readiness.streakDays)-day streak · \(readiness.totalXp) XP")
                }
                .font(.subheadline)
                .foregroundStyle(Palette.ink2)
            }
            Text(readiness.message)
                .font(.caption)
                .foregroundStyle(Palette.ink3)
        }
    }
}

private struct MetricGrid: View {
    let metrics: [Metric]
    @Environment(\.openSection) private var openSection

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 220), spacing: 12)], spacing: 12) {
            ForEach(metrics) { m in
                NavigationLink(value: m.id) {
                    MetricTile(metric: m)
                }
                .buttonStyle(.plain)
            }
        }
    }
}

struct MetricTile: View {
    let metric: Metric

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(metric.shortName)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.ink2)
                Spacer()
                StatusBadge(status: metric.status)
            }
            Text(metric.value ?? "No reading")
                .font(.title2.monospacedDigit().weight(.semibold))
                .foregroundStyle(metric.value == nil ? Palette.ink3 : Palette.ink)
            HStack {
                if let delta = metric.delta {
                    Text(delta).font(.caption.monospacedDigit()).foregroundStyle(Palette.ink2)
                }
                Spacer()
                if metric.freshness != "current" {
                    Label(metric.freshness == "stale" ? "Stale" : "Missing", systemImage: "clock.badge.exclamationmark")
                        .font(.caption)
                        .foregroundStyle(Palette.caution)
                }
                if metric.source == "manual" {
                    Text("Logged").font(.caption).foregroundStyle(Palette.cyan)
                }
            }
        }
        .padding(14)
        .background(Palette.panel, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(metric.status == .nominal ? Palette.line : metric.status.color.opacity(0.6)))
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityHint("Opens the trend and guidance")
    }
}

private struct AdvisoryPanel: View {
    let advisories: [Advisory]

    var body: some View {
        Panel(title: "Environment") {
            ForEach(advisories) { a in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Label(a.level, systemImage: "sun.max.trianglebadge.exclamationmark")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Palette.caution)
                        Text(a.provenanceLabel).font(.caption2.monospaced()).foregroundStyle(Palette.ink3)
                    }
                    Text(a.title).font(.headline).foregroundStyle(Palette.ink)
                    Text(a.summary).font(.subheadline).foregroundStyle(Palette.ink2)
                    Text(a.nextStep).font(.subheadline).foregroundStyle(Palette.ink)
                    Text("Environmental hazard, not a personal dose.").font(.caption).foregroundStyle(Palette.ink3)
                }
            }
        }
    }
}

private struct EarlyWarningPanel: View {
    let snap: Snapshot

    var body: some View {
        Panel(title: "Early warning") {
            if snap.trends.isEmpty && snap.drift.state != "drift" {
                Text("No indicator is trending toward its caution limit, and recent days match your personal baseline.")
                    .font(.subheadline)
                    .foregroundStyle(Palette.ink2)
            }
            ForEach(snap.trends) { t in
                Label(t.text, systemImage: t.direction == "rising" ? "arrow.up.right" : "arrow.down.right")
                    .font(.subheadline)
                    .foregroundStyle(Palette.ink)
            }
            if snap.drift.state == "drift" {
                Label(snap.drift.text, systemImage: "point.3.filled.connected.trianglepath.dotted")
                    .font(.subheadline)
                    .foregroundStyle(Palette.tue)
            }
            Text("Projections and pattern checks never change a status.")
                .font(.caption)
                .foregroundStyle(Palette.ink3)
        }
    }
}

extension Array {
    subscript(safe index: Int) -> Element? { indices.contains(index) ? self[index] : nil }
}
