(function attachPtoMoeRoutingData(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  globalScope.PtoMoeRoutingData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createRoutingDataApi() {
  'use strict';

  const MODEL = Object.freeze({
    totalLayers: 46,
    denseLayers: Object.freeze([0, 1]),
    moeLayers: Object.freeze(Array.from({ length: 44 }, (_, index) => index + 2)),
    expertCount: 256,
    rankCount: 128,
    expertsPerRank: 2,
    topK: 8,
    batchSize: 128,
  });

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function random() {
      value += 0x6D2B79F5;
      let output = value;
      output = Math.imul(output ^ (output >>> 15), output | 1);
      output ^= output + Math.imul(output ^ (output >>> 7), output | 61);
      return ((output ^ (output >>> 14)) >>> 0) / 4294967296;
    };
  }

  function expertToRank(expertId) {
    return Math.floor(Number(expertId) / MODEL.expertsPerRank);
  }

  function createTokenRoute(tokenId, layer) {
    const random = mulberry32((tokenId + 1) * 0x45D9F3B ^ (layer + 11) * 0x119DE1F3);
    const selected = new Set();
    const hotExperts = [
      (layer * 17 + 3) % MODEL.expertCount,
      (layer * 29 + 47) % MODEL.expertCount,
      (layer * 43 + 91) % MODEL.expertCount,
      (layer * 11 + 173) % MODEL.expertCount,
    ];

    for (let slot = 0; slot < MODEL.topK; slot += 1) {
      let expertId;
      const preferHotExpert = slot < 2 && random() < 0.72;
      if (preferHotExpert) {
        expertId = hotExperts[(tokenId + slot + layer) % hotExperts.length];
      } else {
        expertId = Math.floor(random() * MODEL.expertCount);
      }
      while (selected.has(expertId)) expertId = (expertId + 1) % MODEL.expertCount;
      selected.add(expertId);
    }

    const rawScores = Array.from(selected, (expertId, index) => ({
      expertId,
      score: 1.1 - index * 0.055 + random() * 0.42,
    })).sort((left, right) => right.score - left.score);
    const scoreSum = rawScores.reduce((sum, item) => sum + item.score, 0);

    return rawScores.map((item) => Object.freeze({
      expertId: item.expertId,
      rankId: expertToRank(item.expertId),
      weight: item.score / scoreSum,
    }));
  }

  function createRoutingTrace() {
    const layers = new Map();
    MODEL.moeLayers.forEach((layer) => {
      layers.set(layer, Object.freeze(Array.from(
        { length: MODEL.batchSize },
        (_, tokenId) => Object.freeze(createTokenRoute(tokenId, layer))
      )));
    });
    return layers;
  }

  function computeLayerStats(routes) {
    const expertLoads = new Uint16Array(MODEL.expertCount);
    const rankLoads = new Uint16Array(MODEL.rankCount);
    routes.forEach((route) => route.forEach(({ expertId, rankId }) => {
      expertLoads[expertId] += 1;
      rankLoads[rankId] += 1;
    }));

    const totalCopies = routes.length * MODEL.topK;
    const averageExpertLoad = totalCopies / MODEL.expertCount;
    const averageRankLoad = totalCopies / MODEL.rankCount;
    const variance = Array.from(expertLoads).reduce(
      (sum, load) => sum + Math.pow(load - averageExpertLoad, 2),
      0
    ) / expertLoads.length;
    const overloadThreshold = averageExpertLoad * 1.5;
    const rankOverloadThreshold = averageRankLoad * 1.5;

    return Object.freeze({
      expertLoads,
      rankLoads,
      totalCopies,
      averageExpertLoad,
      averageRankLoad,
      coefficientOfVariation: Math.sqrt(variance) / averageExpertLoad,
      overloadThreshold,
      rankOverloadThreshold,
      overloadedExperts: Array.from(expertLoads).filter((load) => load > overloadThreshold).length,
      idleExperts: Array.from(expertLoads).filter((load) => load === 0).length,
      maximumExpertLoad: Math.max(...expertLoads),
      maximumRankLoad: Math.max(...rankLoads),
    });
  }

  function validateTrace(trace) {
    const errors = [];
    if (!(trace instanceof Map)) errors.push('Trace must be a Map keyed by MoE layer.');
    MODEL.moeLayers.forEach((layer) => {
      const routes = trace.get(layer);
      if (!Array.isArray(routes) || routes.length !== MODEL.batchSize) {
        errors.push(`L${layer} must contain ${MODEL.batchSize} token routes.`);
        return;
      }
      routes.forEach((route, tokenId) => {
        if (!Array.isArray(route) || route.length !== MODEL.topK) {
          errors.push(`L${layer}/T${tokenId} must contain exactly ${MODEL.topK} experts.`);
          return;
        }
        const expertIds = new Set();
        let weightSum = 0;
        route.forEach(({ expertId, rankId, weight }) => {
          if (!Number.isInteger(expertId) || expertId < 0 || expertId >= MODEL.expertCount) {
            errors.push(`L${layer}/T${tokenId} has invalid expert ${expertId}.`);
          }
          if (rankId !== expertToRank(expertId)) {
            errors.push(`L${layer}/T${tokenId}/E${expertId} has invalid rank ${rankId}.`);
          }
          expertIds.add(expertId);
          weightSum += weight;
        });
        if (expertIds.size !== MODEL.topK) errors.push(`L${layer}/T${tokenId} contains duplicate experts.`);
        if (Math.abs(weightSum - 1) > 1e-9) errors.push(`L${layer}/T${tokenId} router weights do not sum to 1.`);
      });
    });
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  return Object.freeze({
    MODEL,
    expertToRank,
    createRoutingTrace,
    computeLayerStats,
    validateTrace,
  });
});
