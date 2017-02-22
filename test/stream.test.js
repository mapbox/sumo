'use strict';

/* eslint-disable no-console */

const test = require('tape');
const auth = require('./auth');
const stream = require('../lib/stream');
const Job = require('../lib/job');

test('[stream] messages', (assert) => {
  const query = '| count _sourceCategory';
  const from = Date.now() - 5 * 60 * 1000;
  const to = Date.now();
  const messages = new Set();

  auth()
    .then((data) => Job.create(data, query, from, to))
    .then((job) => {
      const readMessages = new Promise((resolve, reject) => {
        console.log(`Reading messages from search: ${job.searchJobId}`);
        new stream.Messages(job)
          .on('error', (err) => reject(err))
          .on('data', (msg) => {
            if (messages.has(JSON.stringify(msg)))
              assert.fail(`duplicate message received: ${JSON.stringify(msg)}`);
            messages.add(JSON.stringify(msg));
          })
          .on('end', () => resolve(Array.from(messages).length));
      });

      const waitForCompleted = new Promise((resolve) => {
        job.once('completed', () => resolve(job.status.messageCount));
      });

      return Promise.all([readMessages, waitForCompleted, Promise.resolve(job)]);
    })
    .then((results) => {
      assert.ok(results[0] >= results[1], `read ${results[0]}/${results[1]} messages`);
      return Promise.all([results[2].checkStatus(), results[1]]);
    })
    .then((results) => {
      assert.equal(results[0].messageCount, results[1], 'status check still returns the same messageCount');
    })
    .catch((err) => assert.ifError(err, 'test failed'))
    .then(() => assert.end());
});

test('[stream] records', (assert) => {
  const query = '| count _sourceCategory';
  const from = Date.now() - 5 * 60 * 1000;
  const to = Date.now();
  const records = new Set();

  auth()
    .then((data) => Job.create(data, query, from, to))
    .then((job) => {
      const readRecords = new Promise((resolve, reject) => {
        console.log(`Reading records from search: ${job.searchJobId}`);
        new stream.Records(job)
          .on('error', (err) => reject(err))
          .on('data', (msg) => {
            if (records.has(JSON.stringify(msg)))
              assert.fail(`duplicate record received: ${JSON.stringify(msg)}`);
            records.add(JSON.stringify(msg));
          })
          .on('end', () => resolve(Array.from(records).length));
      });

      const waitForCompleted = new Promise((resolve) => {
        job.once('completed', () => resolve(job.status.recordCount));
      });

      return Promise.all([readRecords, waitForCompleted, Promise.resolve(job)]);
    })
    .then((results) => {
      assert.ok(results[0] >= results[1], `read ${results[0]}/${results[1]} records`);
      return Promise.all([results[2].checkStatus(), results[1]]);
    })
    .then((results) => {
      assert.equal(results[0].recordCount, results[1], 'status check still returns the same recordCount');
    })
    .catch((err) => assert.ifError(err, 'test failed'))
    .then(() => assert.end());
});
