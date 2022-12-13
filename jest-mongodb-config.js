module.exports = {
  mongodbMemoryServerOptions: {
    binary: {
      verison: '6.0.1',
      skipMD5: true
    },
    autoStart: false,
    instance: {}
  },

  useSharedDBForAllJestWorkers: false
};
