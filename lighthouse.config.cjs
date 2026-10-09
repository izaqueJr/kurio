module.exports = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  },
}
