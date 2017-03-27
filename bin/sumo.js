#!/usr/bin/env node

'use strict';

/* eslint-disable no-console */

const meow = require('meow');
const sumoStream = require(`${__dirname}/../lib/cli`).sumoStream;
const validate = require(`${__dirname}/../lib/cli`).validate;

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
  string: ['query', 'from', 'to', 'duration'],
  default: {
    from: '15m'
  }
});

const auth = validate(cli);
sumoStream(auth, cli);
