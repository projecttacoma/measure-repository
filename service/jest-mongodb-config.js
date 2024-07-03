module.exports = {
  mongodbMemoryServerOptions: {
    binary: {
      version: '6.0.1',
      skipMD5: true
    },
    autoStart: false,
    instance: {},
    replSet: {
      count: 3,
      storageEngine: 'wiredTiger'
    }
  }
};
