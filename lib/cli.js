'use strict';

/* eslint-disable no-console */

const stream = require('stream');
const sumo = require('..');

module.exports.validate = validate;
function validate(cli) {
  if (!cli.flags.query) {
    console.error('ERROR: --query is required');
    cli.showHelp(1);
  }

  const auth = {
    accessId: process.env.SUMO_LOGIC_ACCESS_ID || process.env.MAPBOX_CLI_SUMOLOGIC_ACCESS_ID,
    accessKey: process.env.SUMO_LOGIC_ACCESS_KEY || process.env.MAPBOX_CLI_SUMOLOGIC_ACCESS_KEY
  };

  if (!auth.accessId || !auth.accessKey) {
    console.error('ERROR: requires environment variables $SUMO_LOGIC_ACCESS_ID and $SUMO_LOGIC_ACCESS_KEY');
    cli.showHelp(1);
  }

  return auth;
}

module.exports.parseTime = parseTime;
function parseTime(str) {
  const match = str.match(/(\d.*)(\w.*)/);
  const num = Number(match[1]);
  const qualifier = match[2];
  switch (qualifier) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

module.exports.sumoStream = sumoStream;
function sumoStream(auth, cli) {
  const search = {
    auth,
    query: cli.flags.query,
    from: Date.now() - parseTime(cli.flags.from)
  };

  if (cli.flags.duration) {
    search.to = search.from + parseTime(cli.flags.duration);
  } else if (cli.flags.to) {
    search.to = Date.now() - parseTime(cli.flags.to);
  } else {
    search.to = Date.now();
  }

  const stringify = new stream.Transform({
    objectMode: true,
    transform: function(obj, enc, callback) {
      format(cli, obj, enc, callback);
    }
  });

  const results = cli.flags.grouped ?
    sumo.createReadStream('records', search) :
    sumo.createReadStream('messages', search);

  results
      .on('error', (err) => console.error(err))
    .pipe(stringify)
      .on('error', (err) => console.error(err))
    .pipe(process.stdout);
}

module.exports.format = format;
function format(cli, obj, enc, callback) {
  if (cli.flags.grouped || cli.flags.json)
    return callback(null, `${JSON.stringify(obj)}\n`);
  callback(null, `${obj._raw.trim()}\n`);
}
