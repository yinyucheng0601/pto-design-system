'use strict';

const assert = require('node:assert/strict');
const dataApi = require('./routing-data.js');

const trace = dataApi.createRoutingTrace();
const validation = dataApi.validateTrace(trace);

assert.equal(validation.valid, true, validation.errors.join('\n'));
assert.equal(trace.size, 44);
assert.equal(trace.get(2).length, 128);
assert.equal(trace.get(2)[0].length, 8);
assert.equal(dataApi.expertToRank(0), 0);
assert.equal(dataApi.expertToRank(1), 0);
assert.equal(dataApi.expertToRank(2), 1);
assert.equal(dataApi.expertToRank(255), 127);

for (const layer of dataApi.MODEL.moeLayers) {
  const stats = dataApi.computeLayerStats(trace.get(layer));
  assert.equal(stats.totalCopies, 1024);
  assert.equal(Array.from(stats.expertLoads).reduce((sum, value) => sum + value, 0), 1024);
  assert.equal(Array.from(stats.rankLoads).reduce((sum, value) => sum + value, 0), 1024);
}

console.log('openPangu MoE routing data validation passed.');
