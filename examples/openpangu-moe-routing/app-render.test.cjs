'use strict';

const assert = require('node:assert/strict');
const dataApi = require('./routing-data.js');

class FakeNode {
  constructor(id = '') {
    this.id = id;
    this.attributes = {};
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.listeners = {};
    this.textContent = '';
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  appendChild(node) { this.children.push(node); return node; }
  replaceChildren() { this.children = []; }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  getBoundingClientRect() { return { left: 0, right: 0, top: 0, width: 1000, height: 900 }; }
}

const root = new FakeNode('moeRoutingExample');
const layerPanel = new FakeNode('layer-panel');
const journeyPanel = new FakeNode('journey-panel');
const layerDiagram = new FakeNode('layer-diagram');
const journeyDiagram = new FakeNode('journey-diagram');
const tooltip = new FakeNode('tooltip');
const stage = new FakeNode('stage');
const readout = new FakeNode('readout');
const themeButton = new FakeNode('theme');
const tabs = [new FakeNode('layer-tab'), new FakeNode('journey-tab')];
tabs[0].dataset.moeView = 'layer';
tabs[1].dataset.moeView = 'journey';
const steps = [new FakeNode('previous'), new FakeNode('next')];
steps[0].dataset.moeStep = '-1';
steps[1].dataset.moeStep = '1';

const nodes = new Map([
  ['[data-moe-panel="layer"]', layerPanel],
  ['[data-moe-panel="journey"]', journeyPanel],
  ['[data-moe-diagram="layer"]', layerDiagram],
  ['[data-moe-diagram="journey"]', journeyDiagram],
  ['[data-moe-readout]', readout],
  ['[data-moe-theme]', themeButton],
  ['[data-moe-tooltip]', tooltip],
  ['.pto-moe-routing__stage', stage],
]);
root.querySelector = (selector) => nodes.get(selector) || null;
root.querySelectorAll = (selector) => selector === '[data-moe-view]' ? tabs : selector === '[data-moe-step]' ? steps : [];

global.window = { PtoMoeRoutingData: dataApi, localStorage: { getItem: () => null, setItem() {} } };
global.document = {
  documentElement: { dataset: {} },
  querySelector: (selector) => selector === '#moeRoutingExample' ? root : null,
  createElementNS: () => new FakeNode(),
};
global.globalThis.PtoMoeRoutingData = dataApi;

require('../../patterns/moe-routing/pattern.js');
window.PtoMoeRouting = global.globalThis.PtoMoeRouting;
require('./app.js');

assert.equal(window.PtoMoeRoutingExplorer.switchView('journey'), true);
assert.equal(journeyPanel.hidden, false);
assert.match(journeyDiagram.attributes.viewBox, /^0 0 /);
assert.ok(journeyDiagram.children.length > 900, 'Token journey should render all layers and route branches.');
assert.equal(journeyDiagram.children.filter((node) => node.attributes.class === 'moe-expert-node is-inactive').length, 44 * (256 - 8));
assert.equal(journeyDiagram.children.filter((node) => node.attributes.class === 'moe-expert-node is-routed').length, 44 * 8);
assert.equal(journeyDiagram.children.filter((node) => node.attributes.class === 'moe-aggregate-node').length, 44);
assert.ok(journeyDiagram.children.some((node) => node.attributes.class === 'moe-aggregate-path'));
window.PtoMoeRoutingExplorer.setZoom(0.5);
assert.equal(journeyDiagram.style.width, `${Number(journeyDiagram.dataset.logicalWidth) * 0.5}px`);
assert.equal(journeyDiagram.style.height, `${Number(journeyDiagram.dataset.logicalHeight) * 0.5}px`);
window.PtoMoeRoutingExplorer.zoomIn();
assert.equal(journeyDiagram.style.width, `${Number(journeyDiagram.dataset.logicalWidth) * 0.6}px`);
window.PtoMoeRoutingExplorer.zoomOut();
assert.equal(journeyDiagram.style.width, `${Number(journeyDiagram.dataset.logicalWidth) * 0.5}px`);
window.PtoMoeRoutingExplorer.setTheme('light');
assert.equal(root.dataset.theme, 'light');

console.log('openPangu MoE shared pattern DOM rendering passed.');
