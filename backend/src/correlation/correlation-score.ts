import { ColorGrid } from '../shared/types';

/**
 * Computes a normalised [0, 1] measure of how much structure from preGrid
 * remains detectable in postGrid, via Cohen's kappa over cell-level colour
 * agreement. 0 means no more agreement than chance; 1 means the grids are
 * identical. preGrid and postGrid must have identical dimensions and (by
 * construction, since rotation only permutes cells) the same colour
 * multiset.
 */
export function computeCorrelationScore(
  preGrid: ColorGrid,
  postGrid: ColorGrid,
): number {
  const colorCounts = new Map<string, number>();
  let totalCells = 0;
  let agreementCount = 0;

  for (let y = 0; y < preGrid.length; y++) {
    for (let x = 0; x < preGrid[y].length; x++) {
      const preColor = preGrid[y][x];
      const postColor = postGrid[y][x];
      totalCells++;
      if (preColor === postColor) {
        agreementCount++;
      }
      colorCounts.set(preColor, (colorCounts.get(preColor) ?? 0) + 1);
    }
  }

  const observedAgreement = agreementCount / totalCells;
  let expectedAgreement = 0;
  for (const count of colorCounts.values()) {
    const proportion = count / totalCells;
    expectedAgreement += proportion * proportion;
  }

  if (expectedAgreement === 1) {
    return 1;
  }

  const kappa =
    (observedAgreement - expectedAgreement) / (1 - expectedAgreement);
  return Math.abs(kappa);
}
