'use strict';

const Job = require('./lib/job');
const stream = require('./lib/stream');

/**
 * Create a readable stream of messages or records that result from a Sumo Logic
 * search. **Messages** are the raw log messages, **records** are the result of
 * a search with some form of aggregation (e.g. `count by _sourceCategory`).
 * Credentials can be provided explicitly, or read from environment variables:
 * `SUMO_LOGIC_ACCESS_ID` and `SUMO_LOGIC_ACCESS_KEY`.
 *
 * @param {string} type - one of `messages` or `records`
 * @param {object} search - Sumo Logic search parameters
 * @param {string} search.query - the query string
 * @param {number} search.from - the starting timestamp in ms
 * @param {number} search.to - the ending timestamp in ms
 * @param {object} [search.auth] - Sumo Logic credentials
 * @param {string} [search.auth.accessId] - Sumo Logic access ID
 * @param {string} [search.auth.accessKey] - Sumo Logic access key
 * @param {object} options - readable stream options
 * @returns {object} a readable stream of messages or records
 *
 * @example
 * const sumo = require('@mapbox/sumo');
 * const search = {
 *   query: '"error" | count by _sourceCategory',
 *   from: 1487733054071,
 *   to: 1487733356114,
 *   auth: {
 *     accessId: xxx,
 *     accessKey: xxxx
 *   }
 * };
 * const messages = sumo.createReadStream('messages', search);
 * messages.on('data', (msg) => console.log(msg));
 */
module.exports.createReadStream = (type, search, options) => {
  if (!/^messages|records$/.test(type))
    throw new Error('type must be either messages or records');

  if (!search.auth) search.auth = {
    accessId: process.env.SUMO_LOGIC_ACCESS_ID,
    accessKey: process.env.SUMO_LOGIC_ACCESS_KEY
  };

  if (type === 'messages') return stream.Messages.create(search, options);
  if (type === 'records') return stream.Records.create(search, options);
};

/**
 * Perform a search limited to less that 100 results. This will return both
 * raw messages and aggregate records where applicable. Credentials can be
 * provided explicitly, or read from environment variables:
 * `SUMO_LOGIC_ACCESS_ID` and `SUMO_LOGIC_ACCESS_KEY`.
 *
 * @param {object} search - Sumo Logic search parameters
 * @param {string} search.query - the query string
 * @param {number} search.from - the starting timestamp in ms
 * @param {number} search.to - the ending timestamp in ms
 * @param {number} [search.limit=100] - the maximum number of messages/records
 * @param {object} [search.auth] - Sumo Logic credentials
 * @param {string} [search.auth.accessId] - Sumo Logic access ID
 * @param {string} [search.auth.accessKey] - Sumo Logic access key
 * @param {function} [callback] - a function to call with the results
 * @returns {promise} resolves with the results, an object with two properties,
 * each of which are an array: `.messages` and `.records`
 *
 * @example
 * const sumo = require('@mapbox/sumo');
 * const search = {
 *   query: '"error" | count by _sourceCategory',
 *   from: 1487733054071,
 *   to: 1487733356114,
 *   auth: {
 *     accessId: xxx,
 *     accessKey: xxxx
 *   }
 * };
 * sumo.search(search, (err, data) => {
 *   if (err) throw err;
 *   data.messages.forEach((msg) => console.log(msg));
 *   data.records.forEach((rec) => console.log(rec));
 * });
 */
module.exports.search = (search, callback) => {
  callback = callback || function() {};

  search.limit = search.limit || 100;
  const limit = Math.min(100, search.limit);

  if (!search.auth) search.auth = {
    accessId: process.env.SUMO_LOGIC_ACCESS_ID,
    accessKey: process.env.SUMO_LOGIC_ACCESS_KEY
  };

  return Job.create(
    search.auth,
    search.query,
    search.from,
    search.to
  ).then((job) => Promise.all([
    job.fetchMessages(limit),
    job.fetchRecords(limit),
    Promise.resolve(job)
  ])).then((results) => {
    const data = {
      messages: results[2].messages,
      records: results[2].records
    };
    callback(null, data);
    return Promise.resolve(data);
  }).catch((err) => {
    callback(err);
    return Promise.reject(err);
  });
};
