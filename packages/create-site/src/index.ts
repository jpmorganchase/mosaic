const standardGeneratorConfig = require('@jpmorganchase/mosaic-standard-generator/dist/generator.config.js');

/**
 * Get list of Mosaic default generators, can be composed with your own generators
 */
const getGenerators = () => [
  ['@jpmorganchase/mosaic-standard-generator/dist/generator', standardGeneratorConfig]
];

module.exports = {
  /**
   * This is an extension point for modifying existing generators/configs or adding new ones.
   * They will appear as options within the users create-mosaic-site interactive menu
   */
  getGenerators
};
