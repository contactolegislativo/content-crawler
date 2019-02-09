const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const mkdirp = require('mkdirp');

class CsvContentManager {
  constructor(opts) {
    this.REPOSITORY = opts && opts.REPOSITORY ? opts.REPOSITORY : './scraper';
    mkdirp(this.REPOSITORY);
  }

  ensureExistance(file, callback) {
    // Creating fodler hierarchy
    mkdirp(file.substring(0, file.lastIndexOf(path.sep)), callback)
  }

  store(file, content, encoding) {
    file = path.join(this.REPOSITORY, file);
    encoding = encoding || 'UTF-8'
    this.ensureExistance(file, function(err) {
      if(!err) {    
        var output = iconv.decode(content, encoding); // "ISO-8859-1"
        fs.writeFile(file, output, function(err) {
            if (err) console.log(err);
        });
      }
    });
  }
}

exports.CsvContentManager = CsvContentManager;
