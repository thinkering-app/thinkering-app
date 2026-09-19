import ExpoModulesCore

/// Where this build was installed from (docs/08 §Release channel). A build is
/// promoted from TestFlight to the App Store unchanged, so this can't be baked
/// in at build time; it's read from the install instead.
public class ReleaseChannelModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReleaseChannel")

    Constant("channel") { Self.channel() }
  }

  static func channel() -> String {
    #if targetEnvironment(simulator)
    return "simulator"
    #else
    // Development and ad hoc builds carry their provisioning profile; anything
    // Apple distributed has it stripped.
    if Bundle.main.path(forResource: "embedded", ofType: "mobileprovision") != nil {
      return "internal"
    }
    // TestFlight installs get a sandbox receipt, App Store installs a real one.
    if Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt" {
      return "testflight"
    }
    return "app_store"
    #endif
  }
}
