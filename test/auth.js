'use strict';

module.exports = () => {
  const accessId = process.env.SUMO_LOGIC_ACCESS_ID || process.env.MAPBOX_CLI_SUMOLOGIC_ACCESS_ID;
  const accessKey = process.env.SUMO_LOGIC_ACCESS_KEY || process.env.MAPBOX_CLI_SUMOLOGIC_ACCESS_KEY;
  return Promise.resolve({ accessId, accessKey });
};
