# sumo

A Node.js SDK for [Sumo Logic's Search Job API](https://help.sumologic.com/APIs/02Search_Job_API/About_the_Search_Job_API)

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### createReadStream

Create a readable stream of messages or records that result from a Sumo Logic
search. **Messages** are the raw log messages, **records** are the result of
a search with some form of aggregation (e.g. `count by _sourceCategory`).
Credentials can be provided explicitly, or read from environment variables:
`SUMO_LOGIC_ACCESS_ID` and `SUMO_LOGIC_ACCESS_KEY`.

**Parameters**

-   `type` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** one of `messages` or `records`
-   `search` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** Sumo Logic search parameters
    -   `search.query` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the query string
    -   `search.from` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** the starting timestamp in ms
    -   `search.to` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** the ending timestamp in ms
    -   `search.auth` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)?** Sumo Logic credentials
        -   `search.auth.accessId` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)?** Sumo Logic access ID
        -   `search.auth.accessKey` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)?** Sumo Logic access key
-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** readable stream options

**Examples**

```javascript
const sumo = require('@mapbox/sumo');
const search = {
  query: '"error" | count by _sourceCategory',
  from: 1487733054071,
  to: 1487733356114,
  auth: {
    accessId: xxx,
    accessKey: xxxx
  }
};
const messages = sumo.createReadStream('messages', search);
messages.on('data', (msg) => console.log(msg));
```

Returns **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** a readable stream of messages or records

### search

Perform a search limited to less that 100 results. This will return both
raw messages and aggregate records where applicable. Credentials can be
provided explicitly, or read from environment variables:
`SUMO_LOGIC_ACCESS_ID` and `SUMO_LOGIC_ACCESS_KEY`.

**Parameters**

-   `search` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** Sumo Logic search parameters
    -   `search.query` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the query string
    -   `search.from` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** the starting timestamp in ms
    -   `search.to` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** the ending timestamp in ms
    -   `search.limit` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)?** the maximum number of messages/records (optional, default `100`)
    -   `search.auth` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)?** Sumo Logic credentials
        -   `search.auth.accessId` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)?** Sumo Logic access ID
        -   `search.auth.accessKey` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)?** Sumo Logic access key
-   `callback` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)?** a function to call with the results

**Examples**

```javascript
const sumo = require('@mapbox/sumo');
const search = {
  query: '"error" | count by _sourceCategory',
  from: 1487733054071,
  to: 1487733356114,
  auth: {
    accessId: xxx,
    accessKey: xxxx
  }
};
sumo.search(search, (err, data) => {
  if (err) throw err;
  data.messages.forEach((msg) => console.log(msg));
  data.records.forEach((rec) => console.log(rec));
});
```

Returns **[promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** resolves with the results, an object with two properties,
each of which are an array: `.messages` and `.records`