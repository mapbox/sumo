'use strict';

/* eslint-disable no-console */

const file = require(`${__dirname}/../lib/cli`);
const queue = require('d3-queue').queue;
const Readable = require('stream').Readable;
const sinon = require('sinon');
const stream = require(`${__dirname}/fixtures/stream`);
const sumo = require(`${__dirname}/..`);
const test = require('tape');

const realSumoId = process.env.SUMO_LOGIC_ACCESS_ID;
const realMbxId = process.env.MAPBOX_CLI_SUMOLOGIC_ACCESS_ID;
const realSumoKey = process.env.SUMO_LOGIC_ACCESS_KEY;
const realMbxKey = process.env.MAPBOX_CLI_SUMOLOGIC_ACCESS_KEY;

test('[validate]', (t) => {
  const error = sinon.stub(console, 'error');
  function showHelp(number) { t.equal(number, 1); }

  /* No flags */
  file.validate({ showHelp: showHelp, flags: {} });
  t.equal(error.getCall(0).args[0], 'ERROR: --query and --from are required');

  /* No --from flag */
  file.validate({ showHelp: showHelp, flags: { query: 'error' } });
  t.equal(error.getCall(1).args[0], 'ERROR: --query and --from are required');

  /* No --query flag */
  file.validate({ showHelp: showHelp, flags: { from: '10m' } });
  t.equal(error.getCall(2).args[0], 'ERROR: --query and --from are required');

  /* No accessId */
  process.env.SUMO_LOGIC_ACCESS_ID =
  process.env.MAPBOX_CLI_SUMOLOGIC_ACCESS_ID = '';
  file.validate({ showHelp: showHelp, flags: { query: 'error', from: '10m' } });
  t.equal(error.getCall(3).args[0], 'ERROR: requires environment variables $SUMO_LOGIC_ACCESS_ID and $SUMO_LOGIC_ACCESS_KEY');

  /* No accessKey */
  process.env.SUMO_LOGIC_ACCESS_KEY =
  process.env.MAPBOX_CLI_SUMOLOGIC_ACCESS_KEY = '';
  file.validate({ showHelp: showHelp, flags: { query: 'error', from: '10m' } });
  t.equal(error.getCall(4).args[0], 'ERROR: requires environment variables $SUMO_LOGIC_ACCESS_ID and $SUMO_LOGIC_ACCESS_KEY');

  restore();
  t.end();
});

test('[parseTime]', (t) => {
  t.equal(file.parseTime('1s'), 1 * 1000, `1s equals ${1 * 1000}ms`);
  t.equal(file.parseTime('1m'), 1 * 60 * 1000, `1m equals ${1 * 60 * 1000}ms`);
  t.equal(file.parseTime('1h'), 1 * 60 * 60 * 1000, `1h equals ${1 * 60 * 60 * 1000}ms`);
  t.equal(file.parseTime('1d'), 1 * 24 * 60 * 60 * 1000, `1d equals ${1 * 24 * 60 * 60 * 1000}ms`);
  t.equal(file.parseTime('1p'), null, 'invalid unit defaults to null');
  t.end();
});

test('[sumoStream]', (t) => {
  const auth = {
    accessId: 'some-access-id',
    accessKey: 'some-access-key'
  };

  const createReadStream = sinon.stub(sumo, 'createReadStream').callsFake(() => {
    const readable = new Readable();
    readable._read = function() {};
    setTimeout(() => {
      stream.forEach((s) => { readable.emit('data', s); });
      readable.emit('end');
    }, 500);
    return readable;
  });

  /* --query and --from */
  file.sumoStream(auth, { flags: { query: 'error', from: '10m' } });
  let args = createReadStream.getCall(0).args;
  t.equal(args[0], 'messages');
  t.deepEqual(args[1].auth, auth);
  t.equal(args[1].query, 'error');
  t.ok(/^\d{13}$/.test(args[1].from));
  t.ok(/^\d{13}$/.test(args[1].to));
  t.equal(args[1].to - args[1].from, 600000);

  /* --query, --from, and --duration */
  file.sumoStream(auth, { flags: { query: 'error', from: '10m', duration: '5m' } });
  args = createReadStream.getCall(1).args;
  t.equal(args[0], 'messages');
  t.deepEqual(args[1].auth, auth);
  t.equal(args[1].query, 'error');
  t.ok(/^\d{13}$/.test(args[1].from));
  t.ok(/^\d{13}$/.test(args[1].to));
  t.equal(args[1].to - args[1].from, 300000);

  /* --query, --from, and --to */
  file.sumoStream(auth, { flags: { query: 'error', from: '10m', to: '2m' } });
  args = createReadStream.getCall(2).args;
  t.equal(args[0], 'messages');
  t.deepEqual(args[1].auth, auth);
  t.equal(args[1].query, 'error');
  t.ok(/^\d{13}$/.test(args[1].from));
  t.ok(/^\d{13}$/.test(args[1].to));
  t.equal(args[1].to - args[1].from, 480000);

  /* --query, --from, and --json */
  file.sumoStream(auth, { flags: { query: 'error', from: '10m', json: true } });
  args = createReadStream.getCall(3).args;
  t.equal(args[0], 'messages');
  t.deepEqual(args[1].auth, auth);
  t.equal(args[1].query, 'error');
  t.ok(/^\d{13}$/.test(args[1].from));
  t.ok(/^\d{13}$/.test(args[1].to));
  t.equal(args[1].to - args[1].from, 600000);

  /* --query, --from, and --grouped */
  file.sumoStream(auth, { flags: { query: 'error', from: '10m', grouped: true } });
  args = createReadStream.getCall(4).args;
  t.equal(args[0], 'records');
  t.deepEqual(args[1].auth, auth);
  t.equal(args[1].query, 'error');
  t.ok(/^\d{13}$/.test(args[1].from));
  t.ok(/^\d{13}$/.test(args[1].to));
  t.equal(args[1].to - args[1].from, 600000);

  sumo.createReadStream.restore();
  t.end();
});

test('[format] json', (t) => {
  const q = queue(1);
  stream.forEach((r) => {
    q.defer(file.format, { flags: { grouped: true } }, r, 'utf8');
    q.defer(file.format, { flags: { json: true } }, r, 'utf8');
  });

  q.awaitAll((err, res) => {
    t.ifError(err, 'should not error');
    res.forEach((r) => { t.ok(JSON.parse(r), 'should be JSON-parsable'); });
    t.end();
  });
});

test('[format] string', (t) => {
  const q = queue(1);
  stream.forEach((r) => {
    q.defer(file.format, { flags: {} }, r, 'utf8');
  });

  q.awaitAll((err, res) => {
    t.ifError(err, 'should not error');
    res.forEach((r) => {
      t.ok(/^\S.*\S\n$/.test(r), 'should not have leading or trailing whitespaces');
      try { JSON.parse(r); }
      catch (err) { t.equal(err.message, 'Unexpected token F', 'not JSON-parsable'); }
    });
    t.end();
  });
});

function restore() {
  process.env.SUMO_LOGIC_ACCESS_ID = realSumoId;
  process.env.MAPBOX_CLI_SUMOLOGIC_ACCESS_ID = realMbxId;
  process.env.SUMO_LOGIC_ACCESS_KEY = realSumoKey;
  process.env.MAPBOX_CLI_SUMOLOGIC_ACCESS_KEY = realMbxKey;
  console.error.restore();
}
