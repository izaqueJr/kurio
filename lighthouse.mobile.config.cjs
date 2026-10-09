module.exports = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'mobile',
    screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false },
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  },
}
