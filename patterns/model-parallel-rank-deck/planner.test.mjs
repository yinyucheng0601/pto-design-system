import assert from 'node:assert/strict';

globalThis.window=globalThis;
await import('./pattern.js');

const api=globalThis.PtoModelParallelRankDeck;
const model={id:'openpangu-flash',layerCount:46,routedExperts:256,stageRanges:[[0,11],[12,22],[23,34],[35,45]]};
const plan=api.partitionModel(model,api.DEFAULT_TOPOLOGY);

assert.equal(plan.manifests.length,128);
assert.equal(new Set(plan.coordinates.map(item=>JSON.stringify([item.tp,item.pp,item.cp,item.ep,item.edp]))).size,128);
assert.equal(plan.stats.layerInstances,1472);
assert.equal(plan.stats.staticInstances,64);
assert.deepEqual(plan.manifestByRank.get(0).layerSegments,[{start:0,end:11,stage:0}]);
assert.deepEqual(plan.manifestByRank.get(6).layerSegments,[{start:35,end:45,stage:3}]);
assert.ok(plan.manifestByRank.get(0).staticRoles.includes('input'));
assert.ok(plan.manifestByRank.get(6).staticRoles.includes('output'));
assert.deepEqual(plan.manifestByRank.get(0).expertOwnership.ids,[...Array(32).keys()]);
assert.deepEqual(plan.manifestByRank.get(8).expertOwnership.ids,[...Array(32).keys()].map(value=>value+32));
assert.equal(plan.groups.filter(group=>group.axis==='tp').length,64);
assert.ok(plan.groups.filter(group=>group.axis==='tp').every(group=>group.ranks.length===2));
assert.equal(plan.groups.filter(group=>group.axis==='pp').length,32);
assert.ok(plan.groups.filter(group=>group.axis==='pp').every(group=>group.ranks.length===4));
assert.equal(plan.groups.filter(group=>group.axis==='ep').length,16);
assert.ok(plan.groups.filter(group=>group.axis==='ep').every(group=>group.ranks.length===8));
assert.equal(plan.groups.filter(group=>group.axis==='edp').length,64);
assert.ok(plan.groups.filter(group=>group.axis==='edp').every(group=>group.ranks.length===2));
assert.equal(plan.manifestByRank.get(0).payloadSignature,plan.manifestByRank.get(64).payloadSignature);
assert.ok(api.layoutPosition(plan.manifestByRank.get(0).coordinate,plan.topology).z>0,'First REP row must be nearest the camera');
assert.ok(api.layoutPosition(plan.manifestByRank.get(127).coordinate,plan.topology).z<0,'Last REP row must be farthest from the camera');
assert.deepEqual(api.ISOMETRIC_POSE,{rx:-35.264,ry:45});
assert.throws(()=>api.partitionModel(model,{...api.DEFAULT_TOPOLOGY,worldSize:127}),/worldSize/);
assert.throws(()=>api.partitionModel({...model,stageRanges:[[0,11],[12,22],[23,34],[34,45]]},api.DEFAULT_TOPOLOGY),/exactly once/);

console.log('model-parallel-rank-deck planner: 20 assertions passed');
