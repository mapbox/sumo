'use strict';

const stream = require('stream');
const Job = require('./job');

class Readable extends stream.Readable {
  constructor(type, options) {
    super(Object.assign({}, options, { objectMode: true }));
    this.type = type;
    this.completed = false;
    this.jobCompleted = false;
    this.pending = false;
  }

  set job(job) {
    if (this.job) throw new Error('Cannot set .job more than once');

    this._job = job;
    this._job.once('completed', () => this.jobCompleted = true);
    this._job.on('error', (err) => this.emit('error', err));

    this.results = this._job[`${this.type}s`];
    this.fields = this._job[`${this.type}Fields`];
    this.fetch = () => {
      this.pending = true;
      return this._job.fetch(this.type).then((data) => {
        this.pending = false;
        return Promise.resolve(data);
      }).catch((err) => {
        this.pending = false;
        return Promise.reject(err);
      });
    };

    this.emit('job');
  }

  get job() {
    return this._job;
  }

  _read() {
    if (!this.job) return this.once('job', () => this._read());
    let status = true;
    while (status && this.results.length)
      status = this.push(this.results.shift());

    if (this.results.length) return;

    if (this.completed) return this.push(null);

    if (status && !this.pending) {
      this.fetch().then((data) => {
        const isEmpty = !data.length;
        if (this.jobCompleted && isEmpty) this.completed = true;

        return this._read();
      }).catch((err) => this.emit('error', err));
    }
  }
}

class Messages extends Readable {
  constructor(job, options) {
    super('message', options);
    if (job) this.job = job;
  }

  static create(search, options) {
    const messages = new Messages(null, options);

    Job.create(
      search.auth,
      search.query,
      search.from,
      search.to,
      search.timeZone
    ).then((job) => {
      messages.job = job;
    }).catch((err) => {
      messages.emit('error', err);
    });

    return messages;
  }
}

class Records extends Readable {
  constructor(job, options) {
    super('record', options);
    if (job) this.job = job;
  }

  static create(search, options) {
    const records = new Records(null, options);

    Job.create(
      search.auth,
      search.query,
      search.from,
      search.to,
      search.timeZone
    ).then((job) => {
      records.job = job;
    }).catch((err) => {
      records.emit('error', err);
    });

    return records;
  }
}

module.exports = { Messages, Records };
