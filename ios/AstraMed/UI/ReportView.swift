import SwiftUI

/// Plain-text summary for the flight surgeon, built on the iPad from engine output.
struct ReportView: View {
    @Environment(MissionModel.self) private var model
    @State private var text = ""

    var body: some View {
        ScrollView {
            Text(text.isEmpty ? "Building the summary…" : text)
                .font(.callout.monospaced())
                .foregroundStyle(Palette.ink)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
        }
        .consoleBackground()
        .navigationTitle("Flight surgeon summary")
        .toolbar {
            ToolbarItemGroup {
                Button("Copy", systemImage: "doc.on.doc") {
                    UIPasteboard.general.string = text
                    model.notice = "Summary copied."
                }
                .disabled(text.isEmpty)
                ShareLink(item: text, subject: Text("ASTRA-MED health summary"))
                    .disabled(text.isEmpty)
            }
        }
        .task(id: "\(model.snapshot?.day ?? 0)-\(model.snapshot?.settings.scenarioId ?? "")") {
            text = await model.report()
        }
    }
}
