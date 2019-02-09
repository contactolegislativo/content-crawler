const path = require('path');
const { WebContentManager } = require('./services/web-content-manager');
const { CsvContentManager } = require('./services/csv-content-manager');

const { SenatorContentProcessor } = require('./processors/senator-processor');
const { DeputyContentProcessor } = require('./processors/deputy-processor');
const config = require('./config/diputados');

const processor = new DeputyContentProcessor();
const contentManager = new WebContentManager(config, path.join(__dirname, '../data'), processor);
const csvContentManager = new CsvContentManager({
  REPOSITORY: path.join(__dirname, '../data/dump')
});

contentManager.fetch('A', 1, function(data) {
  csvContentManager.store('deputies/congressman.csv', processor.content.congressman);
  csvContentManager.store('deputies/attendance.csv', processor.content.attendance);
});

// contentManager.fetch('A', 1, function(data) {
//   csvContentManager.store('senate/main.csv', processor.content.main);
//   csvContentManager.store('senate/congressman.csv', processor.content.congressman);
//   csvContentManager.store('senate/attendance.csv', processor.content.attendance);
// });