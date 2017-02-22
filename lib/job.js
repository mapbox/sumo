'use strict';

const events = require('events');
const http = require('got');
const qs = require('querystring');

class Job extends events.EventEmitter {
  constructor(auth, query, from, to, timeZone) {
    super();

    from = from.toString();
    to = to.toString();

    this.messages = [];
    this.messageFields = [];
    this.messageOffset = 0;
    this.records = [];
    this.recordFields = [];
    this.recordOffset = 0;

    this.status = {
      state: 'CREATING',
      messageCount: -1,
      recordCont: -1
    };

    this.options = {
      json: true,
      auth: `${auth.accessId}:${auth.accessKey}`,
      headers: { 'content-type': 'application/json' }
    };

    const options = Object.assign({
      body: JSON.stringify({ query, from, to, timeZone })
    }, this.options);

    http.post('https://api.sumologic.com/api/v1/search/jobs', options)
      .then((response) => {
        this.searchJobId = response.headers.location;
        this.options.headers.cookie = response.headers['set-cookie'];
        this.emit('created', this.searchJobId);
      })
      .catch((err) => {
        this.emit('error', err);
      });

    this.pollStatus();
  }

  static create(auth, query, from, to, timeZone) {
    return new Promise((resolve, reject) => {
      const job = new Job(auth, query, from, to, timeZone);
      job.once('created', () => resolve(job));
      job.once('error', (err) => reject(err));
    });
  }

  onceCreated() {
    if (this.searchJobId) return Promise.resolve();
    return new Promise((resolve) => this.once('created', () => setTimeout(resolve, 1000)));
  }

  waitForResults(type, attempts) {
    const attr = `${type}Count`;
    if (this.status[attr] > 0) return Promise.resolve();

    if (!attempts) attempts = 0;
    attempts++;

    return new Promise((resolve, reject) => {
      if (attempts > 6)
        return reject(new Error(`No ${type}s were found after 30s`));

      const wait = Math.max(1000 * Math.pow(2, attempts), 5000);
      const retry = () => this.waitForResults(type, attempts).then(resolve);
      setTimeout(retry, wait);
    });
  }

  pollStatus() {
    this.checkStatus().then(() => {
      if (this.status.state === 'DONE GATHERING RESULTS')
        return this.emit('completed');

      setTimeout(() => this.pollStatus(), 2500);
    }).catch((err) => this.emit('error', err));
  }

  checkStatus(attempts) {
    if (!attempts) attempts = 0;
    attempts++;

    return this.onceCreated()
      .then(() => http.get(this.searchJobId, this.options))
      .then((response) => Object.assign(this.status, response.body));
  }

  fetch(type, limit, offset) {
    const query = qs.stringify({
      offset: offset || this[`${type}Offset`],
      limit: limit || 10000
    });
    const url = `${this.searchJobId}/${type}s?${query}`;

    const request = (attempts) => {
      if (!attempts) attempts = 0;
      attempts++;

      return this.waitForResults(type)
        .then(() => http.get(url, this.options))
        .then((response) => {
          this[`${type}Fields`] = response.body.fields;
          this[`${type}Offset`] = this[`${type}Offset`] + response.body[`${type}s`].length;
          response.body[`${type}s`].forEach((message) => this[`${type}s`].push(message.map));
          return response.body;
        })
        .catch((err) => {
          if (err.statusCode !== 429 || attempts > 6)
            return Promise.reject(err);

          return new Promise((resolve, reject) => {
            const wait = Math.max(1000 * Math.pow(2, attempts), 5000);
            const retry = () => request(attempts).then(resolve, reject);
            setTimeout(retry, wait);
          });
        });
    };

    return request();
  }

  fetchRecords(limit, offset) {
    return this.fetch('record', limit, offset);
  }

  fetchMessages(limit, offset) {
    return this.fetch('message', limit, offset);
  }
}

module.exports = Job;
