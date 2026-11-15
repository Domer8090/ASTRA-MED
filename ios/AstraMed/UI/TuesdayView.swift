import SwiftUI

/// Tuesday, the crew companion. Fixed replies and onboard guidance come from the
/// core; Apple's on-device model answers when the iPad has one. Nothing leaves the iPad.
struct TuesdayView: View {
    @Environment(MissionModel.self) private var model
    @Environment(\.openContact) private var openContact
    @Environment(\.openSection) private var openSection
    @State private var draft = ""
    @State private var showCheckIn = false
    @FocusState private var focused: Bool

    private let starters = ["How am I doing today?", "I'm bored", "I can't sleep", "I miss home"]

    var body: some View {
        if let snap = model.snapshot {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 12) {
                            if snap.tuesday.messages.isEmpty {
                                Panel {
                                    Text("Hey, I'm Tuesday.").font(.title3.weight(.semibold)).foregroundStyle(Palette.tue)
                                    Text("I can explain your readings, notice when your pattern drifts from your own baseline, and help you recharge. I never diagnose or suggest medication.")
                                        .foregroundStyle(Palette.ink2)
                                }
                            }
                            ForEach(snap.tuesday.messages) { m in
                                MessageBubble(message: m) { action in handle(action) }
                                    .id(m.id)
                            }
                            if let pending = model.pendingQuestion {
                                HStack {
                                    Spacer(minLength: 80)
                                    Text(pending)
                                        .foregroundStyle(Palette.ink)
                                        .padding(12)
                                        .background(Palette.raised, in: RoundedRectangle(cornerRadius: 14))
                                        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.lineStrong))
                                }
                                Label("Tuesday is thinking on this iPad…", systemImage: "ellipsis")
                                    .font(.caption)
                                    .foregroundStyle(Palette.tue)
                                    .id("pending")
                            }
                        }
                        .padding(20)
                    }
                    .onChange(of: snap.tuesday.messages.count) {
                        if let last = snap.tuesday.messages.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
                    }
                    .onChange(of: model.pendingQuestion) {
                        if model.pendingQuestion != nil { withAnimation { proxy.scrollTo("pending", anchor: .bottom) } }
                    }
                }
                Divider().overlay(Palette.line)
                VStack(alignment: .leading, spacing: 8) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(starters, id: \.self) { s in
                                Button(s) { send(s) }.buttonStyle(.bordered).tint(Palette.tue)
                            }
                            Button("Check in", systemImage: "face.smiling") { showCheckIn = true }
                                .buttonStyle(.bordered)
                        }
                    }
                    HStack {
                        TextField("Message Tuesday", text: $draft, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(1...4)
                            .focused($focused)
                            .onSubmit { send(draft) }
                        Button {
                            send(draft)
                        } label: {
                            Image(systemName: "arrow.up.circle.fill").font(.title)
                        }
                        .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty || model.busy)
                        .accessibilityLabel("Send")
                    }
                    Text(OnDeviceModel.isAvailable ? "Answers by \(OnDeviceModel.name), checked by the onboard safety rules." : "Answers by the onboard rules. No network needed.")
                        .font(.caption2)
                        .foregroundStyle(Palette.ink3)
                }
                .padding(16)
                .background(Palette.panel)
            }
            .background(Palette.space.ignoresSafeArea())
            .navigationTitle("Tuesday")
            .toolbar {
                ToolbarItem {
                    Button("Clear conversation", systemImage: "trash") {
                        Task { await model.perform("clearConversation") }
                    }
                    .disabled(snap.tuesday.messages.isEmpty)
                }
            }
            .sheet(isPresented: $showCheckIn) { CheckInSheet() }
        }
    }

    private func send(_ text: String) {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty, !model.busy else { return }
        draft = ""
        focused = true
        Task { await model.ask(t) }
    }

    private func handle(_ action: TuesdayActionRef) {
        switch action.kind {
        case "contact": openContact(action.priority ?? "routine")
        case "earth", "game", "breathe": openSection(.recharge)
        case "checkin": showCheckIn = true
        case "log": openSection(.log)
        case "guidance": openSection(.vitals)
        case "report": openSection(.report)
        default: break
        }
    }
}

private struct MessageBubble: View {
    let message: TuesdayMessage
    let onAction: (TuesdayActionRef) -> Void

    private var isUser: Bool { message.role == "user" }

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: 80) }
            VStack(alignment: .leading, spacing: 8) {
                if message.role == "officer" {
                    Text("Medical officer, ground").font(.caption.weight(.bold)).foregroundStyle(Palette.cyan)
                }
                Text(message.text)
                    .foregroundStyle(Palette.ink)
                    .textSelection(.enabled)
                if let actions = message.actions, !actions.isEmpty {
                    HStack {
                        ForEach(actions, id: \.self) { a in
                            Button(label(a)) { onAction(a) }
                                .buttonStyle(.bordered)
                                .tint(a.kind == "contact" && a.priority == "urgent" ? Palette.critical : Palette.tue)
                                .font(.caption)
                        }
                    }
                }
                if !isUser {
                    HStack(spacing: 6) {
                        Text(message.via == "model" ? (message.model ?? "On-device model") : "Onboard rules")
                        if let n = message.filtered, n > 0 { Text("· \(n) sentence\(n == 1 ? "" : "s") removed by the safety filter") }
                    }
                    .font(.caption2)
                    .foregroundStyle(Palette.ink3)
                    ForEach(message.sources ?? [], id: \.self) { s in
                        if let url = URL(string: s.url) { Link(s.label, destination: url).font(.caption2) }
                    }
                }
            }
            .padding(12)
            .background(isUser ? Palette.raised : Palette.panel, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(isUser ? Palette.lineStrong : Palette.tueDeep.opacity(0.6)))
            if !isUser { Spacer(minLength: 80) }
        }
    }

    private func label(_ a: TuesdayActionRef) -> String {
        switch a.kind {
        case "earth": "Look at Earth"
        case "game": "Recharge"
        case "breathe": "Breathe"
        case "checkin": "Check in"
        case "guidance": "Guidance"
        case "log": "Log a reading"
        case "contact": a.priority == "urgent" ? "Contact medical officer (urgent)" : "Contact medical officer"
        case "report": "Health summary"
        default: a.kind
        }
    }
}

struct CheckInSheet: View {
    @Environment(MissionModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var mood = 3
    @State private var energy = 3

    var body: some View {
        NavigationStack {
            Form {
                Section("How is your mood?") { scale($mood, low: "Low", high: "Great") }
                Section("How is your energy?") { scale($energy, low: "Drained", high: "Full") }
                Section {
                    Text("Check-ins stay on this iPad. Tuesday uses your latest energy rating in its answers.")
                        .font(.caption)
                        .foregroundStyle(Palette.ink3)
                }
            }
            .navigationTitle("Check in")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await model.logActivity(kind: "checkin", mood: mood, energy: energy)
                            model.notice = "Check-in saved."
                            dismiss()
                        }
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func scale(_ value: Binding<Int>, low: String, high: String) -> some View {
        VStack {
            Picker("Rating", selection: value) {
                ForEach(1...5, id: \.self) { Text("\($0)").tag($0) }
            }
            .pickerStyle(.segmented)
            HStack { Text(low); Spacer(); Text(high) }
                .font(.caption)
                .foregroundStyle(Palette.ink2)
        }
    }
}
