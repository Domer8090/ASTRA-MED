import RealityKit
import SwiftUI

/// Isolation and confinement countermeasures: a view of Earth lit for the real
/// time of day, and a paced breathing round. Everything ships in the app; no network.
struct RechargeView: View {
    @Environment(MissionModel.self) private var model
    @State private var mode = 0

    var body: some View {
        if let snap = model.snapshot {
            VStack(spacing: 16) {
                Picker("Activity", selection: $mode) {
                    Text("Earth").tag(0)
                    Text("Breathe").tag(1)
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 360)
                if mode == 0 {
                    EarthPanel(sun: snap.sun)
                } else {
                    BreathePanel()
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Palette.space.ignoresSafeArea())
            .navigationTitle("Recharge")
        }
    }
}

private struct EarthPanel: View {
    let sun: SunPoint
    @Environment(MissionModel.self) private var model
    @State private var yaw: Float = 0
    @State private var pitch: Float = 0.25
    @State private var dragStart: (Float, Float)?
    @State private var opened = Date()

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            EarthGlobe(sun: sun, yaw: yaw, pitch: pitch)
                .gesture(
                    DragGesture()
                        .onChanged { v in
                            let start = dragStart ?? (yaw, pitch)
                            dragStart = start
                            yaw = start.0 + Float(v.translation.width) * 0.008
                            pitch = max(-1.2, min(1.2, start.1 + Float(v.translation.height) * 0.008))
                        }
                        .onEnded { _ in dragStart = nil }
                )
                .accessibilityLabel("Earth, lit for the current time. Drag to turn it.")
            Text("NASA Blue Marble and city-lights imagery, bundled with the app. Day and night follow the real position of the Sun (overhead at \(String(format: "%.1f", sun.lat))°, \(String(format: "%.1f", sun.lon))°). Drag to turn the globe.")
                .font(.caption)
                .foregroundStyle(Palette.ink3)
        }
        // Open on the daylit side.
        .onAppear { yaw = Float(-sun.lon) * .pi / 180 }
        .onDisappear {
            let minutes = Date().timeIntervalSince(opened) / 60
            if minutes >= 0.25 { Task { await model.logActivity(kind: "earth", minutes: (minutes * 10).rounded() / 10) } }
        }
    }
}

/// RealityKit globe. The texture already carries day, night and the terminator
/// for the current instant, so the globe needs no scene lighting. Longitude 0
/// faces the camera when yaw is 0.
private struct EarthGlobe: View {
    let sun: SunPoint
    let yaw: Float
    let pitch: Float
    @State private var texture: CGImage?

    var body: some View {
        ZStack {
            if let texture {
                RealityView { content in
                    let earth = ModelEntity(mesh: .generateSphere(radius: 0.5))
                    earth.name = "earth"
                    if let resource = try? await TextureResource(image: texture, options: .init(semantic: .color)) {
                        var material = UnlitMaterial()
                        material.color = .init(tint: .white, texture: .init(resource))
                        earth.model?.materials = [material]
                    }
                    content.add(earth)
                    let camera = PerspectiveCamera()
                    camera.position = [0, 0, 1.6]
                    content.add(camera)
                } update: { content in
                    guard let earth = content.entities.first(where: { $0.name == "earth" }) else { return }
                    // Texture longitude 0 sits at -X on the generated sphere; turn it to face the camera.
                    let base = simd_quatf(angle: .pi / 2, axis: [0, 1, 0])
                    earth.orientation = simd_quatf(angle: pitch, axis: [1, 0, 0]) * simd_quatf(angle: yaw, axis: [0, 1, 0]) * base
                }
            } else {
                ProgressView("Lighting the globe for now…").tint(Palette.cyan)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.space)
        .task(id: "\(Int(sun.lat))-\(Int(sun.lon))") {
            let lat = sun.lat, lon = sun.lon
            texture = await Task.detached(priority: .userInitiated) { EarthTexture.make(sunLat: lat, sunLon: lon) }.value
        }
    }
}

private struct BreathePanel: View {
    @Environment(MissionModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var running = false
    @State private var inhale = false
    @State private var cycles = 0
    private let total = 6

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            ZStack {
                Circle().stroke(Palette.line, lineWidth: 2)
                Circle()
                    .fill(Palette.tue.opacity(0.18))
                    .overlay(Circle().strokeBorder(Palette.tue, lineWidth: 2))
                    .scaleEffect(reduceMotion ? 0.8 : (inhale ? 1 : 0.45))
                Text(running ? (inhale ? "Breathe in" : "Breathe out") : "One minute")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Palette.ink)
            }
            .frame(width: 300, height: 300)
            .accessibilityElement(children: .combine)
            Text(running ? "Round \(min(cycles + 1, total)) of \(total). In for 4 seconds, out for 6." : "Paced breathing: in for 4 seconds, out for 6, six times.")
                .foregroundStyle(Palette.ink2)
            Button(running ? "Stop" : "Start", systemImage: running ? "stop.fill" : "play.fill") {
                running.toggle()
            }
            .buttonStyle(.borderedProminent)
            .tint(Palette.tueDeep)
            Spacer()
        }
        .task(id: running) {
            guard running else { inhale = false; return }
            cycles = 0
            while running && cycles < total {
                withAnimation(.easeInOut(duration: 4)) { inhale = true }
                try? await Task.sleep(for: .seconds(4))
                guard running else { return }
                withAnimation(.easeInOut(duration: 6)) { inhale = false }
                try? await Task.sleep(for: .seconds(6))
                cycles += 1
            }
            if cycles >= total {
                running = false
                await model.logActivity(kind: "breathe", minutes: 1)
                model.notice = "Breathing round logged."
            }
        }
    }
}
