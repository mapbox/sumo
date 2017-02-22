'use strict';

/* eslint-disable no-console */

const test = require('tape');
const auth = require('./auth');
const Job = require('../lib/job');

test('[job] create', (assert) => {
  const query = '| count _sourceCategory';
  const from = Date.now() - 5 * 60 * 1000;
  const to = Date.now();

  auth()
    .then((data) => Job.create(data, query, from, to))
    .then((job) => {
      assert.equal(job.status.state, 'CREATING', 'started job in CREATING state');
      assert.ok(/^https:\/\/api.sumologic.com\/api\/v1\/search\/jobs\//.test(job.searchJobId), 'job created with searchJobId');
    })
    .catch((err) => assert.ifError(err, 'test failed'))
    .then(() => assert.end());
});

test('[job] status', (assert) => {
  const query = '| count _sourceCategory';
  const from = Date.now() - 5 * 60 * 1000;
  const to = Date.now();
  let searchJob;

  auth()
    .then((data) => Job.create(data, query, from, to))
    .then((job) => {
      searchJob = job;
      return job.checkStatus();
    })
    .then((status) => {
      assert.equal(status.state, 'GATHERING RESULTS', 'status request returned data');
      assert.equal(searchJob.status.state, 'GATHERING RESULTS', 'status request set job status');
    })
    .catch((err) => assert.ifError(err, 'test failed'))
    .then(() => assert.end());
});

test('[job] status polling', (assert) => {
  const query = '| count _sourceCategory';
  const from = Date.now() - 5 * 60 * 1000;
  const to = Date.now();

  auth()
    .then((data) => Job.create(data, query, from, to))
    .then((job) => new Promise((resolve) => {
      console.log('waiting for query to complete...');
      job.once('completed', () => {
        assert.equal(job.status.state, 'DONE GATHERING RESULTS', 'status polling has adjusted job state and emitted done event');
        resolve();
      });
    }))
    .catch((err) => assert.ifError(err, 'test failed'))
    .then(() => assert.end());
});

test('[job] messages', (assert) => {
  const query = '| count _sourceCategory';
  const from = Date.now() - 5 * 60 * 1000;
  const to = Date.now();
  let searchJob, firstOffset;

  auth()
    .then((data) => Job.create(data, query, from, to))
    .then((job) => {
      searchJob = job;
      return job.fetchMessages(10);
    })
    .then((data) => {
      assert.ok(Array.isArray(data.fields), 'returns message fields');
      assert.ok(Array.isArray(data.messages), 'returns messages');

      const messages = data.messages.map((message) => message.map);
      assert.deepEqual(searchJob.messageFields, data.fields, 'sets messageFields on job');
      assert.deepEqual(searchJob.messages, messages, 'buffers messages in job array');
      assert.equal(searchJob.messageOffset, messages.length, 'updates job messageOffset');
      firstOffset = searchJob.messageOffset;
      return searchJob.fetchMessages(10);
    })
    .then((data) => {
      data.messages
        .map((message) => message.map)
        .forEach((message, i) => {
          assert.notDeepEqual(message, searchJob[i], `pagination returns a new message ${i}`);
          assert.deepEqual(message, searchJob.messages[firstOffset + i], `message ${i} from 2nd request landed in messages buffer`);
        });
      assert.equal(searchJob.messageOffset, firstOffset + data.messages.length, 'updates job messageOffset');
    })
    .catch((err) => assert.ifError(err, 'test failed'))
    .then(() => assert.end());
});

test('[job] records', (assert) => {
  const query = '| count _sourceCategory';
  const from = Date.now() - 5 * 60 * 1000;
  const to = Date.now();
  let searchJob, firstOffset;

  auth()
    .then((data) => Job.create(data, query, from, to))
    .then((job) => {
      searchJob = job;
      return job.fetchRecords(10);
    })
    .then((data) => {
      assert.ok(Array.isArray(data.fields), 'returns record fields');
      assert.ok(Array.isArray(data.records), 'returns records');

      const records = data.records.map((record) => record.map);
      assert.deepEqual(searchJob.recordFields, data.fields, 'sets recordFields on job');
      assert.deepEqual(searchJob.records, records, 'buffers records in job array');
      assert.equal(searchJob.recordOffset, records.length, 'updates job recordOffset');
      firstOffset = searchJob.recordOffset;
      return searchJob.fetchRecords(10);
    })
    .then((data) => {
      data.records
        .map((record) => record.map)
        .forEach((record, i) => {
          assert.notDeepEqual(record, searchJob[i], `pagination returns a new record ${i}`);
          assert.deepEqual(record, searchJob.records[firstOffset + i], `record ${i} from 2nd request landed in records buffer`);
        });
      assert.equal(searchJob.recordOffset, firstOffset + data.records.length, 'updates job recordOffset');
    })
    .catch((err) => assert.ifError(err, 'test failed'))
    .then(() => assert.end());
});
