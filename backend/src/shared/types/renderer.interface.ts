import { ColorGrid } from './color-grid.type';
import { CaseSize } from './case-size.type';

/**
 * Contract for a concrete image renderer.
 *
 * `grid` is exactly the ColorGrid produced by the cipher/rotation pipeline
 * (message symbols plus random padding, already rotated) - there is no
 * metadata header of any kind (see this plan's "Design decision" note).
 */
export interface Renderer<T> {
  render(grid: ColorGrid, size: CaseSize): T | Promise<T>;
}
