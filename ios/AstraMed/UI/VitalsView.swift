import Charts
import SwiftUI

struct VitalsView: View {
    @Environment(MissionModel.self) private var model

    var body: some View {
        if let snap = model.snapshot {
            List {
                ForEach(snap.metrics) { m in
                    NavigationLink(value: m.id) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(m.name).foregroundStyle(Palette.ink)
                                Text(m.value ?? "No reading").font(.subheadline.monospacedDigit()).foregroundStyle(Palette.ink2)
                            }
                            Spacer()
                            StatusBadge(status: m.status)
                        }
                    }
                    .listRowBackground(Palette.panel)
                }
            }
            .consoleBackground()
            .navigationTitle("Vitals and trends")
            .navigationDestination(for: String.self) { id in MetricDetailView(metricId: id) }
        }
    }
}

struct MetricDetailView: View {
    let metricId: String
    @Environment(MissionModel.self) private var model
    @Environment(\.openSection) private var openSection
    @State private var window: TrendWindow = .month
    @State private var series: Series?

    var body: some View {
        if let snap = model.snapshot, let m = snap.metric(metricId) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Panel {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(m.value ?? "No reading")
                                    .font(.largeTitle.monospacedDigit().weight(.semibold))
                                    .foregroundStyle(Palette.ink)
                                if let at = m.recordedAt {
                                    Text(at).font(.caption.monospaced()).foregroundStyle(Palette.ink3)
                                }
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 6) {
                                StatusBadge(status: m.status, large: true)
                                SyntheticTag()
                            }
                        }
                        Text(m.summary).foregroundStyle(Palette.ink)
                        Text(m.explanation).font(.subheadline).foregroundStyle(Palette.ink2)
                        Label(m.recommendedNextStep, systemImage: "arrow.forward.circle")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Palette.ink)
                        BasisLine(basis: m.basis)
                    }

                    if metricId != "symptoms" {
                        Panel(title: "Trend") {
                            Picker("Window", selection: $window) {
                                ForEach(TrendWindow.allCases) { w in Text(w.label).tag(w) }
                            }
                            .pickerStyle(.segmented)
                            TrendChart(series: series, metricId: metricId, selectedDay: snap.day)
                                .frame(height: 260)
                            if let lines = series?.lines {
                                Text("Dashed lines: configured caution and critical limits (\(lines.provenance)). Prototype values, not NASA flight rules.")
                                    .font(.caption)
                                    .foregroundStyle(Palette.ink3)
                            }
                            ForEach(series?.events ?? []) { e in
                                Label("Days \(e.startDay)–\(e.endDay): \(e.title)", systemImage: "flag")
                                    .font(.caption)
                                    .foregroundStyle(Palette.ink2)
                            }
                        }
                    }

                    if !m.rules.isEmpty {
                        Panel(title: "Rules that set this status") {
                            ForEach(m.rules) { r in
                                VStack(alignment: .leading, spacing: 2) {
                                    HStack {
                                        StatusBadge(status: r.status)
                                        Text(r.description).font(.subheadline.weight(.semibold))
                                    }
                                    Text("Observed \(r.observed). Limit \(r.threshold). Provenance: \(r.provenance).")
                                        .font(.caption)
                                        .foregroundStyle(Palette.ink2)
                                }
                            }
                        }
                    }

                    Panel(title: "How to measure") {
                        Text(m.guidance.whatItMeasures).font(.subheadline).foregroundStyle(Palette.ink2)
                        Text("Device: \(m.guidance.deviceRequired)").font(.subheadline).foregroundStyle(Palette.ink)
                        ForEach(Array(m.guidance.howToMeasure.enumerated()), id: \.offset) { i, step in
                            HStack(alignment: .top) {
                                Text("\(i + 1).").font(.subheadline.monospacedDigit()).foregroundStyle(Palette.cyan)
                                Text(step).font(.subheadline).foregroundStyle(Palette.ink)
                            }
                        }
                        Text("In microgravity: \(m.guidance.microgravityEffects)").font(.subheadline).foregroundStyle(Palette.ink2)
                        Text("When to repeat: \(m.guidance.whenToRepeat)").font(.subheadline).foregroundStyle(Palette.ink2)
                        if let ref = m.guidance.reference, let url = URL(string: ref.url) {
                            Link(ref.label, destination: url).font(.caption)
                        }
                        Button("Log a reading", systemImage: "square.and.pencil") { openSection(.log) }
                            .buttonStyle(.borderedProminent)
                    }
                }
                .padding(20)
            }
            .consoleBackground()
            .navigationTitle(m.name)
            .task(id: "\(metricId)-\(window.rawValue)-\(snap.day)-\(snap.settings.scenarioId)") {
                series = await model.series(metricId, window: window)
            }
        }
    }
}

/// Engine values only. Reference and limit lines are drawn from the configured thresholds, never compared here.
struct TrendChart: View {
    let series: Series?
    let metricId: String
    let selectedDay: Int

    private struct Point: Identifiable {
        let id: String
        let day: Int
        let key: String
        let value: Double
        let status: HealthStatus
    }

    private var points: [Point] {
        guard let series else { return [] }
        return series.points.flatMap { p in
            series.keys.compactMap { k in
                guard let v = p.values[k] ?? nil else { return nil }
                return Point(id: "\(k)-\(p.day)", day: p.day, key: k, value: v, status: p.status)
            }
        }
    }

    var body: some View {
        if let series, !points.isEmpty {
            Chart {
                if let ref = series.lines?.reference, ref.count == 2, metricId != "bloodPressure" {
                    RectangleMark(xStart: .value("Start", series.range[0]), xEnd: .value("End", series.range[1]), yStart: .value("Low", ref[0]), yEnd: .value("High", ref[1]))
                        .foregroundStyle(Palette.cyan.opacity(0.08))
                }
                ForEach(series.lines?.caution ?? [], id: \.self) { y in
                    RuleMark(y: .value("Caution limit", y))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                        .foregroundStyle(Palette.caution.opacity(0.8))
                }
                ForEach(series.lines?.critical ?? [], id: \.self) { y in
                    RuleMark(y: .value("Critical limit", y))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [2, 3]))
                        .foregroundStyle(Palette.critical.opacity(0.8))
                }
                ForEach(points) { p in
                    LineMark(x: .value("Mission day", p.day), y: .value(label(p.key), p.value), series: .value("Series", label(p.key)))
                        .foregroundStyle(by: .value("Series", label(p.key)))
                        .interpolationMethod(.monotone)
                    if p.status != .nominal {
                        PointMark(x: .value("Mission day", p.day), y: .value(label(p.key), p.value))
                            .foregroundStyle(p.status.color)
                            .symbolSize(24)
                    }
                }
                RuleMark(x: .value("Selected day", selectedDay))
                    .foregroundStyle(Palette.ink.opacity(0.5))
            }
            .chartXScale(domain: series.range[0]...max(series.range[0] + 1, series.range[1]))
            .chartYScale(domain: .automatic(includesZero: false))
            .chartForegroundStyleScale(range: [Palette.cyan, Color(hex: 0x4C8DFF)])
            .chartXAxisLabel("Mission day")
            .chartLegend(series.keys.count > 1 ? .visible : .hidden)
            .accessibilityLabel("Trend for days \(series.range[0]) to \(series.range[1])")
        } else {
            ContentUnavailableView("No readings in this window", systemImage: "chart.xyaxis.line")
        }
    }

    private func label(_ key: String) -> String {
        switch key {
        case "systolic": "Systolic"
        case "diastolic": "Diastolic"
        case "cumulativeDose": "Cumulative dose (mSv)"
        case "dailyDose": "Daily dose (mSv)"
        default: "Value"
        }
    }
}
