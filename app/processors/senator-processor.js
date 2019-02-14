const cheerio = require('cheerio');

function toCsv() {
  let line = '';
  for(i in arguments) {
    let data = arguments[i].indexOf(',') >= 0 ? '\"' + arguments[i] + '\"': arguments[i];
    line +=  data   + ', ';
  }
  return line.substring(0, line.length - 2);
}

function findGender(text) {
  if(text.indexOf('Senadora') >= 0) {
    return 'F';
  } else {
    return 'M';
  }
}

function handleName(text) {
  return text.replace('Sen.', '').replace('Senadora', '').replace('Senador', '').trim();
}

function handleRegex(regex, position) {
  if(regex == null) return 'uknown';
  return regex.length >= position ? regex[position].trim() : 'uknown';
}

function handleOffice(text) {
  let regexFloor = /(Piso)\s+(\d+)/g.exec(text);
  let regexOffice = /(Oficina)\s+(\d+)/g.exec(text);
  return {
    floor: handleRegex(regexFloor, 2),
    office: handleRegex(regexOffice, 2)
  }
}

function handleContact(text) {
  let regexPhone = /(Tel):\s([\d\s()]+)/g.exec(text);
  let regexExt = /(Ext)\.\s([\d]+)/g.exec(text);
  let regexEmail = /(E-mail):\s([\w\.@]+)/g.exec(text);
  
  return {
    phone: handleRegex(regexPhone, 2),
    ext: handleRegex(regexExt, 2),
    email: handleRegex(regexEmail, 2)
  }
}

let month = {
  'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6, 
  'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 
  'diciembre': 12
}

function handleDate(text) {
  let regexDate = /(\d+).de.(\w+).de.(\d+)/g.exec(text);
  let date = {
    day: handleRegex(regexDate, 1),
    month: handleRegex(regexDate, 2),
    year: handleRegex(regexDate, 3)
  };
  return date.day + '/' + month[date.month] + '/' + date.year;
}

function handleSurrogate(text) {
  let regex = /Suplente.(.+)/g.exec(text);
  return handleRegex(regex, 1);
}

function handleComision(text) {
  let regex = /idComision=(\d+)/g.exec(text);
  return handleRegex(regex, 1);
}

function handleElectionType(text) {
  let regex = /(Mayoría Relativa|Primera Minoría|Representación Proporcional)/g.exec(text);
  return handleRegex(regex, 1);
}

function handleURL(text) {
  let regex = /(\d{4})/g.exec(text);
  return handleRegex(regex, 1);
}

function handleImageName(url) {
  return url ? url.substring(url.lastIndexOf('/') + 1, url.length) : 'uknown.jpg';
}

class SenatorContentProcessor {
  constructor() {
    this.content = {
        main: '',
        attendance: '',
        congressman: ''
    }
  }
  
  none() {
    
  }
  
  main(url, content, baseUrl) {
    console.log('  Parsing' + url);
    const $ = cheerio.load(content);
    const _self = this;
    
    if(_self.content.main.length == 0) {
      _self.content.main += toCsv(
        'id', 'source', 'party', 'logo', 'name', 'picture', 
        'state', 'stateImg', 'floor', 'office', 'phone', 'ext', 
        'email', 'facebook', 'twitter', 'youtube', 
        'instagram'
      ) + '\n';  
    }
    
    $('.main .row .col-sm-4 .panel').filter(function(index){        
        
        // Party
        let panel = $(this).attr('class');
        let name = $(this).find('.panel-heading h3 strong a');
        let partyLogo = $(this).find('.panel-heading a img').attr('src');
        let source = name.attr('href');
        let deputy = {
          id: handleURL(source),
          source: baseUrl + source,
          party: panel.substring(panel.indexOf('-') + 1, panel.length).toUpperCase(),
          partyLogo: handleImageName(partyLogo),
          name: handleName(name.text()),
          picture: handleImageName($(this).find('.panel-body .img-capital img').attr('src')),
          location: $(this).find('.panel-footer .btnTxt').text(),
          locationImg: handleImageName($(this).find('.panel-footer img').attr('src')),
          facebook: '', twitter: '', youtube: '', instagram: ''
        }
        
        // Addition Info
        $(this).find('.panel-body .text-left').filter(function(index) {
          let text = $(this).text();
          if(index == 0) {
            let office = handleOffice(text);
            deputy.floor = office.floor;
            deputy.office = office.office;
          }
          if(index == 1) {
            let contact = handleContact(text);
            deputy.phone = contact.phone;
            deputy.ext = contact.ext;
            deputy.email = contact.email;
          }
        });
        
        // Social Network
        $(this).find('.panel-footer a').filter(function(index) {
          let url = $(this).attr('href');
          if(url.indexOf('twitter') >= 0) {
             deputy.twitter = url;
          } else if(url.indexOf('facebook') >= 0) {
             deputy.facebook = url;
          } else if(url.indexOf('youtube') >= 0) {
             deputy.youtube = url;
          } else if(url.indexOf('instagram') >= 0) {
             deputy.instagram = url;
          } 
        });
        
        _self.content.main += toCsv(
          deputy.id, deputy.source, deputy.party, deputy.partyLogo, deputy.name, deputy.picture, 
          deputy.location, deputy.locationImg, deputy.floor, deputy.office, deputy.phone, deputy.ext, 
          deputy.email, deputy.facebook, deputy.twitter, deputy.youtube, 
          deputy.instagram
        ) + '\n';
    });
  }
  
  congressman(url, content, baseUrl) {
    console.log('  Parsing' + url);
    const $ = cheerio.load(content);
    const _self = this;
    
    if(_self.content.congressman.length == 0) {
      _self.content.congressman += toCsv('id', 'source', 
        'displayName', 'gender', 'type', 'surrogate', 
        // 'floor', 'office', 'phone', 'ext', 'email', 
        'position', 'comisionId', 'comision', 'href') + '\n';    
    }
    
    let name = $('.main h2').text();
    let deputy = {
      id: handleURL(url),
      source: baseUrl + url,
      displayName: handleName(name),
      gender: findGender(name)
    };
    
    $('.main .row .col-sm-9 .row .col-sm-12').filter(function(index) {
      switch (index) {
        case 0:
          let type = $(this).text().trim();
          deputy.type = handleElectionType(type);
          break;
        case 1:
          deputy.surrogate = handleSurrogate($(this).text().trim());
          break;
        case 2:
          let text = $(this).text();
          let office = handleOffice(text);
          let contact = handleContact(text);
          
          deputy.floor = office.floor;
          deputy.office = office.office;
          deputy.phone = contact.phone;
          deputy.ext = contact.ext;
          deputy.email = contact.email;

          break;
        case 3:
          break;
        case 4:
          let position = '';
          let children = $(this).children();
          if(children.length == 0) {
            _self.content.congressman += toCsv(deputy.id, deputy.source, 
              deputy.displayName, deputy.gender, deputy.type, deputy.surrogate, 
              // deputy.floor, deputy.office, deputy.phone, deputy.ext, deputy.email
            ) + '\n';  
          } else {
            $(this).children().each(function(index, el) {
              if(el.name == 'p' || el.name == 'strong') {
                position = $(this).text().replace(':','');
                // Junta de Coordinación Política
                if(position.indexOf('Junta') >= 0) {
                  position = 'Coordinador del Grupo Parlamentario';
                } 
              } else if(el.name == 'ul') {
                $(this).find('li a').each(function(index) {
                  let text = $(this).text();
                  if(text.indexOf('Grupo Parlamentario') >= 0)
                    text = 'Junta de Coordinación Política';
                  let comision = text;
                  
                  let href = $(this).attr('href');
                  let id = handleComision(href);
                  _self.content.congressman += toCsv(deputy.id, deputy.source, 
                    deputy.displayName, deputy.gender, deputy.type, deputy.surrogate, 
                    // deputy.floor, deputy.office, deputy.phone, deputy.ext, deputy.email, 
                    position, id, comision, href) + '\n';  
                });
              }
            });  
          }
          break;  
      }
      
    });
    
  }
  
  attendance(url, content) {
    console.log('  Parsing' + url);
    const $ = cheerio.load(content);
    const _self = this;
    
    if(_self.content.attendance.length == 0) {
      _self.content.attendance += toCsv('id', 'source', 
        'name', 'periodo', 'year', 'date', 
        'type') + '\n';    
    }
    
    let period = '';
    let deputy = {
      id: handleURL(url),
      source: url,
      name: '',
      period: '',
      date: '',
      type: ''
    };
    $('.main .row:nth-last-child(-n+3)').filter(function(index){        
        switch (index) {
          case 0:
              let name = $(this).find('a strong').text();
              if(name) deputy.name = handleName(name);
            break;
          case 1:
            $(this).find('tr').filter(function(index) {
              let header = $(this).find('th h4').html();
              if(header) {
                period = header.replace('&#xF1;', 'ñ').split('<br>');
              } else {
                $(this).find('td').filter(function(index) {
                  switch (index) {
                    case 0:
                      break;
                    case 1:
                      deputy.date = handleDate($(this).find('a').text());
                      break;
                    case 2: 
                      deputy.type = $(this).text();
                      break;
                  }
                });
                _self.content.attendance += toCsv(deputy.id, deputy.source, 
                  deputy.name, period[0], period[1], deputy.date.trim(), 
                  deputy.type.trim()) + '\n';  
              }
            });
            break;
        }
    });
    
  }
  
  initiatives(url, content) {
    console.log('  Parsing' + url);
  }
  
  votes(url, content) {
    console.log('  Parsing' + url);
  }
}

exports.SenatorContentProcessor = SenatorContentProcessor;