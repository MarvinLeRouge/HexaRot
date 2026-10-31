import { gridDimensions } from './build-grid';

// Same reference cases as frontend/src/utils/image-budget.spec.ts, so both
// sides are known to compute the same grid for a Hexahue (2 x 3) message.
describe('gridDimensions', () => {
  it.each([
    [0, 5, 10, 5],
    [11, 5, 10, 10],
    [1000, 7, 84, 77],
    [10750, 5, 250, 260],
    [10800, 5, 250, 265],
    [1, 181, 362, 181],
    [29000, 255, 510, 510],
  ])(
    'lays %i characters at pivot %i on a %i x %i case grid',
    (messageLength, pivotBlockSize, width, height) => {
      expect(gridDimensions(messageLength, 2, 3, pivotBlockSize)).toEqual({
        width,
        height,
      });
    },
  );
});
