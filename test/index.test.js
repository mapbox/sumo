'use strict';

const test = require('tape');
const auth = require('./auth');
const sumo = require('..');

test('[index] message stream, provided auth', (assert) => {
  const search = {
    query: '| count _sourceCategory',
    from: Date.now() - 5 * 60 * 1000,
    to: Date.now()
  };

  const messages = new Set();

  auth().then((data) => {
    search.auth = data;
    const readable = sumo.createReadStream('messages', search);

    readable.on('data', (msg) => {
      if (messages.has(JSON.stringify(msg)))
        assert.fail(`duplicate message received: ${JSON.stringify(msg)}`);
      messages.add(JSON.stringify(msg));
    });

    readable.on('error', (err) => {
      assert.ifError(err, 'failed');
      assert.end();
    });

    readable.on('end', () => {
      const found = Array.from(messages).length;
      const expected = readable.job.status.messageCount;
      assert.ok(found >= expected, `read ${found}/${expected} messages`);
      assert.end();
    });
  });
});

test('[index] record stream, auth from env', (assert) => {
  const search = {
    query: '| count _sourceCategory',
    from: Date.now() - 5 * 60 * 1000,
    to: Date.now()
  };

  const records = new Set();

  auth().then((data) => {
    process.env.SUMO_LOGIC_ACCESS_ID = data.accessId;
    process.env.SUMO_LOGIC_ACCESS_KEY = data.accessKey;

    const readable = sumo.createReadStream('records', search);

    readable.on('data', (msg) => {
      if (records.has(JSON.stringify(msg)))
        assert.fail(`duplicate record received: ${JSON.stringify(msg)}`);
      records.add(JSON.stringify(msg));
    });

    readable.on('error', (err) => {
      assert.ifError(err, 'failed');
      assert.end();
    });

    readable.on('end', () => {
      const found = Array.from(records).length;
      const expected = readable.job.status.recordCount;
      assert.ok(found >= expected, `read ${found}/${expected} records`);
      delete process.env.SUMO_LOGIC_ACCESS_ID;
      delete process.env.SUMO_LOGIC_ACCESS_KEY;
      assert.end();
    });
  });
});

test('[index] search w/o callback, provided auth, no limit', (assert) => {
  const search = {
    query: '| count _sourceCategory',
    from: Date.now() - 5 * 60 * 1000,
    to: Date.now()
  };

  auth().then((data) => {
    search.auth = data;
    return sumo.search(search);
  }).then((data) => {
    assert.equal(data.messages.length, 10000, 'returned 10000 messages');
    assert.ok(data.records.length > 100, 'returned at least 100 records');
  }).catch((err) => assert.ifError(err, 'test failed'))
    .then(() => assert.end());
});

test('[index] search w/callback, auth from env, provided limit', (assert) => {
  const search = {
    query: '| count _sourceCategory',
    from: Date.now() - 5 * 60 * 1000,
    to: Date.now(),
    limit: 10
  };

  auth().then((data) => {
    process.env.SUMO_LOGIC_ACCESS_ID = data.accessId;
    process.env.SUMO_LOGIC_ACCESS_KEY = data.accessKey;

    sumo.search(search, (err, data) => {
      assert.ifError(err, 'success');
      assert.equal(data.messages.length, 10, 'returned 10 messages');
      assert.equal(data.records.length, 10, 'returned 10 records');
      delete process.env.SUMO_LOGIC_ACCESS_ID;
      delete process.env.SUMO_LOGIC_ACCESS_KEY;
      assert.end();
    });
  });
});

test('[index] search w/o aggregation', (assert) => {
  const search = {
    query: '"error"',
    from: Date.now() - 1 * 60 * 1000,
    to: Date.now(),
    limit: 10
  };

  auth().then((data) => {
    process.env.SUMO_LOGIC_ACCESS_ID = data.accessId;
    process.env.SUMO_LOGIC_ACCESS_KEY = data.accessKey;

    sumo.search(search, (err, data) => {
      assert.ifError(err, 'success');
      assert.equal(data.messages.length, 10, 'returned 10 messages');
      assert.equal(data.records.length, 0, 'returned 0 records');

      delete process.env.SUMO_LOGIC_ACCESS_ID;
      delete process.env.SUMO_LOGIC_ACCESS_KEY;
      assert.end();
    });
  });
});
