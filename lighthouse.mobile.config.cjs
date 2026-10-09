// Perfil mobile padrão do Lighthouse (Moto G Power, "slow 4G" simulado, CPU 4x), viewport de 390 px.
module.exports = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'mobile',
    screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false },
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  },
}
