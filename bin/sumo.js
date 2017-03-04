#!/usr/bin/env node

'use strict';

/* eslint-disable no-console */

const meow = require('meow');
const sumo = require('..');
const stream = require('stream');

const cli = meow({
  help: `
  USAGE: sumo [OPTIONS]

  Options:
    -q, --query     the query string
    -f, --from      the starting time, defaults to 15 minutes ago
    -t, --to        the ending time, defaults to now
    -d, --duration  the amount of time to search, starting at --from
    -g, --grouped   print aggregate search results, not raw log messages
    -j, --json      when printing raw log messages, print as JSON string. Without
                    this flag, only the log message itself will print. With it,
                    all Sumo Logic fields will be provided

  Configuration:
    SUMO_LOGIC_ACCESS_ID and SUMO_LOGIC_ACCESS_KEY must be set as environment
    variables.

  Specifying times
    --from 1s = one second ago
    --from 5m = five minutes ago
    --from 2h = two hours ago
    --from 1d = one day ago
  `,
  description: 'Search Sumo Logic'
}, {
  alias: { q: 'query', f: 'from', t: 'to', g: 'grouped', d: 'duration', j: 'json' },
  boolean: ['grouped', 'all'],
  string: ['query', 'from', 'to', 'duration']
});

if (!cli.flags.query || !cli.flags.from) {
  console.error('ERROR: --query and --from are required');
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

const parseTime = (str) => {
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
};

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
    if (cli.flags.grouped || cli.flags.json)
      return callback(null, `${JSON.stringify(obj)}\n`);
    callback(null, `${obj._raw.trim()}\n`);
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
