const cheerio = require('cheerio');

function toCsv() {
  let line = '';
  for(i in arguments) {
    let data = arguments[i].indexOf(',') >= 0 ? '\'' + arguments[i] + '\'': arguments[i];
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
  return text.replace(/Sen\.|Senador|Senadora|Dip\.|Diputado/, '').trim();
}

function clean(text) {
  return text.replace(/(\r\n|\n|\r)/gm, '');
}

function handleSessionId(text) {
  let regex = /pert=(\d{1,4})/g.exec(text);
  return handleRegex(regex, 1);
}

function handleDeputyId(text) {
  let regex = /iddipt=(\d{1,4})/g.exec(text);
  return handleRegex(regex, 1);
}

function handleCalendarDate(text) {
  let regex = /(\w+)\s+(\d+)/g.exec(text);
  return {
    month: handleRegex(regex, 1),
    year: handleRegex(regex, 2)
  }
}

function handleCalendarAttendance(text) {
  let regex = /(\d+)(\D+)/g.exec(text);
  return {
    day: handleRegex(regex, 1),
    status: handleRegex(regex, 2)
  }
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
  let regex = /(\d{1,4})/g.exec(text);
  return handleRegex(regex, 1);
}

function handleParty(text) {
  let regex = /\/(\w+).(png|jpg)/g.exec(text);
  return handleRegex(regex, 1);
}

function handleBirthDate(text) {
  let regex = /(\d+)-(\w+)/g.exec(text);
  return {
    day: handleRegex(regex, 1),
    month: month[handleRegex(regex, 2)],
    year: 2019
  }
}

function handleLocation(text) {
  let regex = /(.+)\|\s+(Distrito|Circunscripción):\s+(\d+).+\|(.+)/g.exec(text);
  return {
    state: handleRegex(regex, 1),
    area: handleRegex(regex, 3),
    office: handleRegex(regex, 4),
  }
}

class DeputyContentProcessor {
  constructor() {
    this.content = {
        congressman: '',
        attendance: ''
    };
    
    this.data = {
      sessions: {}
    };
    
    this.content.congressman += toCsv( 'id', 'source', 'picture', 
      'name', 'type', 'state', 'area', 'office', 
      'email', 'birthname', 'surrogate', 'party', 'partyImg');
    this.content.attendance += toCsv('sessionId', 'sessionName', 'deputyId', 
      'status', 'date', 'sources') + '\n';
  }
  
  main(url, content) {
    console.log('  Parsing ' + url);
  }
  
  congressman(url, content) {
    console.log('  Parsing congressman ' + url);  
    const $ = cheerio.load(content);
    const _self = this;
  
    let deputy = {
      id: handleURL(url),
      source: url
    };
    
    $('table.cajasombra > tbody > tr > td > table > tbody > tr > td').filter(function(index){
      switch(index) {
        case 0:
          deputy.picture = $(this).find('img').attr('src');
          break;
        case 2:
          $(this).find('td').each(function(index) {
            let text = $(this).text();
            switch(index) {
              case 0: // Name
              deputy.name = handleName(text);
              break;
              case 2: // Type
              deputy.type = text;
              break;
              case 4: // Location
              let location = handleLocation(clean(text));
              deputy.state = location.state;
              deputy.area = location.area;
              deputy.office = location.office;
              break;
              case 6: // email
              deputy.email = text.trim();
              break;
              case 8: // birthname
              let date = handleBirthDate(text);
              deputy.birthname = date.day + '/' + date.month + '/' + date.year;
              break;
              case 10: // surrogate
              deputy.surrogate = clean(text);
              break;
            }
          });
          break;
        case 3: 
          let party = $(this).find('img').attr('src');
          deputy.party = handleParty(party);
          deputy.partyImg = party;
          break;
      }
    });
    
    _self.content.congressman += toCsv( deputy.id, deputy.source, deputy.picture, 
      deputy.name, deputy.type, deputy.state, deputy.area, deputy.office, 
      deputy.email, deputy.birthname, deputy.surrogate, deputy.party, deputy.partyImg) + '\n';
  } 
  
  attendanceIntermediate(url, content) {
    console.log('  Parsing intermediate ' + url);
    const $ = cheerio.load(content);
    const _self = this;
    
    let tables = $('table');
    $(tables[tables.length - 1]).find('tr > :nth-child(2) a').each(function(index) {
      let sessionId = handleSessionId($(this).attr('href'));
      let sessionName = clean($(this).text());
      _self.data.sessions[sessionId] = sessionName;
    });
    
  }
  
  attendance(url, content) {
    console.log('  Parsing attendance ' + url);
    const $ = cheerio.load(content);
    const _self = this;
    
    let sessionId = handleSessionId(url);
    let deputyId = handleDeputyId(url);
    
    $('table table table table').each(function(index) {
      let header = $(this).find('.TitulosVerde').text().trim();
      if(header.length > 0) {
        let date = handleCalendarDate(header);
        $(this).find('td').each(function(index) {
          let text = $(this).text().trim();
          if(text.length > 0 ) {
            let attendance = handleCalendarAttendance(text);
            if(attendance.status != 'uknown') {
              let attendanceDate = attendance.day + '/' + month[date.month.toLowerCase()] + '/' + date.year ;
              _self.content.attendance += toCsv(sessionId, _self.data.sessions[sessionId], deputyId, attendance.status, attendanceDate, url) + '\n';
            }
          }
        });
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

exports.DeputyContentProcessor = DeputyContentProcessor;
