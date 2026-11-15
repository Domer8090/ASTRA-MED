import SwiftUI

enum AppSection: String, CaseIterable, Identifiable, Hashable {
    case overview, vitals, log, countermeasures, hazards, tuesday, recharge, report, settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .overview: "Overview"
        case .vitals: "Vitals and trends"
        case .log: "Log a reading"
        case .countermeasures: "Countermeasures"
        case .hazards: "Hazards and body systems"
        case .tuesday: "Tuesday"
        case .recharge: "Recharge"
        case .report: "Flight surgeon summary"
        case .settings: "Settings"
        }
    }

    var symbol: String {
        switch self {
        case .overview: "gauge.with.dots.needle.67percent"
        case .vitals: "waveform.path.ecg"
        case .log: "square.and.pencil"
        case .countermeasures: "checklist"
        case .hazards: "shield.lefthalf.filled"
        case .tuesday: "bubble.left.and.text.bubble.right"
        case .recharge: "globe.americas"
        case .report: "doc.text"
        case .settings: "gearshape"
        }
    }
}

struct RootView: View {
    @Environment(MissionModel.self) private var model
    // `-initialSection tuesday` on launch opens a section directly (demos, screenshots).
    @State private var section: AppSection? = AppSection(rawValue: UserDefaults.standard.string(forKey: "initialSection") ?? "") ?? .overview
    @State private var contact: ContactRequest?

    var body: some View {
        Group {
            if let error = model.startError {
                ContentUnavailableView("ASTRA-MED could not start", systemImage: "exclamationmark.triangle", description: Text(error))
            } else if let snap = model.snapshot {
                NavigationSplitView {
                    List(selection: $section) {
                        ForEach(AppSection.allCases) { s in
                            Label(s.title, systemImage: s.symbol)
                                .badge(badge(for: s, snap: snap))
                                .tag(s)
                        }
                    }
                    .navigationTitle("ASTRA-MED")
                    .safeAreaInset(edge: .bottom) { SidebarFooter(snap: snap) }
                } detail: {
                    NavigationStack {
                        detail(for: section ?? .overview)
                            .toolbar { toolbar(snap) }
                    }
                }
                .sheet(item: $contact) { request in
                    ContactView(initialPriority: request.priority)
                        .presentationSizing(.page)
                }
                .overlay(alignment: .bottom) { NoticeBanner() }
            } else {
                ProgressView("Starting the onboard rules engine…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Palette.space)
            }
        }
        .environment(\.openContact, OpenContactAction { priority in
            contact = ContactRequest(priority: priority)
        })
        .environment(\.openSection, OpenSectionAction { section = $0 })
    }

    private func badge(for s: AppSection, snap: Snapshot) -> Int {
        switch s {
        case .vitals: snap.metrics.filter { $0.status != .nominal }.count
        case .countermeasures: snap.tasks.filter { !$0.completed }.count
        default: 0
        }
    }

    @ViewBuilder
    private func detail(for s: AppSection) -> some View {
        switch s {
        case .overview: OverviewView()
        case .vitals: VitalsView()
        case .log: LogReadingView()
        case .countermeasures: CountermeasuresView()
        case .hazards: HazardsView()
        case .tuesday: TuesdayView()
        case .recharge: RechargeView()
        case .report: ReportView()
        case .settings: SettingsView()
        }
    }

    @ToolbarContentBuilder
    private func toolbar(_ snap: Snapshot) -> some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button {
                contact = ContactRequest(priority: model.snapshot?.overall.status == .critical ? "urgent" : "routine")
            } label: {
                Label("Contact medical officer", systemImage: "cross.case")
            }
        }
    }
}

private struct SidebarFooter: View {
    let snap: Snapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                StatusBadge(status: snap.overall.status)
                Spacer()
                SyntheticTag()
            }
            Text("\(snap.mission.shortName) · \(snap.mission.crewId)")
                .font(.caption.monospaced())
                .foregroundStyle(Palette.ink3)
            Text("Prototype thresholds, not NASA flight rules.")
                .font(.caption2)
                .foregroundStyle(Palette.ink3)
        }
        .padding()
        .background(.bar)
    }
}

/// Brief confirmation after the core saved a change.
private struct NoticeBanner: View {
    @Environment(MissionModel.self) private var model

    var body: some View {
        if let notice = model.notice {
            Text(notice)
                .font(.callout)
                .foregroundStyle(Palette.ink)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Palette.raised, in: Capsule())
                .overlay(Capsule().strokeBorder(Palette.lineStrong))
                .padding(.bottom, 24)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .task(id: notice) {
                    try? await Task.sleep(for: .seconds(3))
                    withAnimation { model.notice = nil }
                }
                .accessibilityAddTraits(.updatesFrequently)
        }
    }
}

/// One request to open the contact sheet; a new id each time so the sheet starts fresh.
struct ContactRequest: Identifiable {
    let id = UUID()
    let priority: String
}

struct OpenContactAction {
    let action: (String) -> Void
    func callAsFunction(_ priority: String = "routine") { action(priority) }
}

struct OpenSectionAction {
    let action: (AppSection) -> Void
    func callAsFunction(_ section: AppSection) { action(section) }
}

extension EnvironmentValues {
    @Entry var openContact = OpenContactAction { _ in }
    @Entry var openSection = OpenSectionAction { _ in }
}
