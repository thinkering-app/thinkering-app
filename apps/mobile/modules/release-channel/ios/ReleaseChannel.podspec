Pod::Spec.new do |s|
  s.name           = 'ReleaseChannel'
  s.version        = '1.0.0'
  s.summary        = 'Where this build of thinkering was installed from'
  s.description    = 'Reports whether an iOS build came from TestFlight, the App Store or internal distribution (docs/08).'
  s.author         = ''
  s.homepage       = 'https://thinkering.app'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.swift'
end
