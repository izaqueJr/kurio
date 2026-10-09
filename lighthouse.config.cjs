// Perfil desktop oficial do Lighthouse (equivalente a --preset=desktop): tela 1440x900 e
// throttling "desktopDense4G" (RTT 40 ms, 10 Mbps, sem desaceleração de CPU).
module.exports = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
    throttling: {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
    emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  },
}
