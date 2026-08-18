import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const patternSource = await readFile(new URL('./pattern.js', import.meta.url), 'utf8');
const context = vm.createContext({ window: {}, console });
vm.runInContext(patternSource, context, { filename: 'matrix-canvas/pattern.js' });

const {
  createAggregateLayoutCells,
  resolveSharedAggregateScale,
  synchronizeScale,
} = context.window.PtoMatrixCanvas;

const matmulTensors = [
  { id: 'A', extent: { rows: 1024, columns: 2048 }, axes: { rows: 'M', columns: 'K' } },
  { id: 'B', extent: { rows: 2048, columns: 4096 }, axes: { rows: 'K', columns: 'N' } },
  { id: 'C', extent: { rows: 1024, columns: 4096 }, axes: { rows: 'M', columns: 'N' } },
];

test('shared semantic-axis scale derives different grid counts without changing source scale', () => {
  const plan = resolveSharedAggregateScale({
    tensors: matmulTensors,
    axisScales: { M: 256, K: 256, N: 256 },
    hardBoundaries: { M: [256], N: [256] },
  });

  assert.deepEqual({ ...plan.axisScales }, { M: 256, K: 256, N: 256 });
  assert.deepEqual(
    plan.tensors.map(({ id, rowSpan, columnSpan, grid }) => ({
      id,
      rowSpan,
      columnSpan,
      grid: { ...grid },
    })),
    [
      { id: 'A', rowSpan: 256, columnSpan: 256, grid: { rows: 4, columns: 8 } },
      { id: 'B', rowSpan: 256, columnSpan: 256, grid: { rows: 8, columns: 16 } },
      { id: 'C', rowSpan: 256, columnSpan: 256, grid: { rows: 4, columns: 16 } },
    ]
  );
});

test('shared scale defaults to the greatest common divisor of hard-boundary granularities', () => {
  const plan = resolveSharedAggregateScale({
    tensors: [{ id: 'X', extent: { rows: 1000, columns: 770 }, axes: { rows: 'M', columns: 'K' } }],
    hardBoundaries: { M: [512, 256], K: [256, 128] },
  });

  assert.deepEqual({ ...plan.axisScales }, { M: 256, K: 128 });
  assert.deepEqual({ ...plan.tensors[0].grid }, { rows: 4, columns: 7 });
  assert.deepEqual({ ...plan.tensors[0].tail }, { rows: 232, columns: 2 });
});

test('explicit scale is rejected when it crosses a hard-boundary granularity', () => {
  assert.throws(
    () => resolveSharedAggregateScale({
      tensors: matmulTensors,
      axisScales: { M: 512, K: 256, N: 256 },
      hardBoundaries: { M: [256], N: [256] },
    }),
    /crosses hard boundary granularity 256/
  );
});

test('layout cells preserve source extent and real tail spans', () => {
  const cells = createAggregateLayoutCells(
    { rows: 1000, columns: 770 },
    { blockRows: 256, blockColumns: 128 }
  );
  const tail = cells.at(-1);

  assert.equal(cells.length, 28);
  assert.equal(tail.row, 768);
  assert.equal(tail.column, 768);
  assert.equal(tail.rowSpan, 232);
  assert.equal(tail.columnSpan, 2);
  assert.equal(tail.summary.count, 464);
});

test('controller display scales synchronize to the smallest fitted scale', () => {
  const applied = [];
  const controllers = [0.04, 0.02, 0.01].map((scale, index) => ({
    getViewState: () => ({ scale }),
    setZoom: (nextScale) => applied.push([index, nextScale]),
  }));

  assert.equal(synchronizeScale(controllers), 0.01);
  assert.deepEqual(applied, [[0, 0.01], [1, 0.01], [2, 0.01]]);
});
