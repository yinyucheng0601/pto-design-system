# Hierarchical Timeline Pattern

`hierarchical-timeline` is a domain-neutral profiling timeline. It was extracted from the useful interaction structure of the MB Lifecycle prototype—expandable hierarchy, zoom, profiling window, event selection, and stable evidence IDs—without inheriting its PP/MB/Activation information architecture.

Load `swimlane-task/pattern.js` first. The pattern delegates every event bar and hover tooltip to that primitive.

```js
const timeline = window.PtoHierarchicalTimelinePattern.render(host, {
  data: {
    timeRange: { min: 0, max: 100, step: 1 },
    window: { start: 20, end: 60 },
    defaultExpandedIds: ['phase'],
    rows: [
      { id: 'phase', label: 'Phase', events: [] },
      { id: 'rank', parentId: 'phase', depth: 1, label: 'Rank 2', events: [
        { id: 'event-1', start: 28, end: 44, label: 'Collective', color: '#4f7cff' },
      ] },
    ],
  },
  onSelect(selection) {},
  onWindowChange(window) {},
});
```

The pattern answers **when**, **in what order**, and **which event is causal**. A linked graph or Sankey should answer **where** and **how much**; an Inspector should answer **why** and **what to do next**.
