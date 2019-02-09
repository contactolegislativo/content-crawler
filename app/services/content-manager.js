const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

class ContentManager {
  constructor(opts) {
    this.REPOSITORY = opts && opts.REPOSITORY ? opts.REPOSITORY : './scraper';
    mkdirp(this.REPOSITORY);
  }

  identify(key) {
    key = key.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return path.join(this.REPOSITORY, key);
  }

  getFiles(directory) {
    return fs.readdirSync(path.join(this.REPOSITORY, directory));
  }

  generateFileName(key) {
    // Generate file path according to key
    return `${path.join(this.REPOSITORY, key.toLowerCase().replace(/[._=]/g, '-').replace(/\:\/\/|\/|\?/g,'/'))}.html`;
  }

  ensureExistance(file, callback) {
    // Creating fodler hierarchy
    mkdirp(file.substring(0, file.lastIndexOf(path.sep)), callback)
  }

  store(key, content) {
    let file = this.generateFileName(key);
    this.ensureExistance(file, function(err) {
      if(!err) {
        fs.writeFile(file, content, function(err) {
            if (err) console.log(err);
        });
      }
    });
  }

  read(key) {
    let file = this.generateFileName(key);
    return fs.readFileSync(file);
  }
  
  exist(key) {
    let file = this.generateFileName(key);
    return fs.existsSync(file);
  }
}

exports.ContentManager = ContentManager;
