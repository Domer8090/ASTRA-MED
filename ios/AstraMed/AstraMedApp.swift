import SwiftUI

@main
struct AstraMedApp: App {
    @State private var model = MissionModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .task { await model.start() }
                .preferredColorScheme(.dark)
                .tint(Palette.cyan)
        }
    }
}
