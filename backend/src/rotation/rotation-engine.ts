import { Injectable } from '@nestjs/common';
import { ColorGrid } from '../shared/types';
import { ReadingOrder, RotationSequence } from '../key/key-codec';
import { ReadingOrderRegistry } from '../reading-order/reading-order.registry';
import { rotateBlock, RotationAngle, RotationDirection } from './rotate-block';

const ROTATION_ANGLES: RotationAngle[] = [0, 90, 180, 270];

/**
 * Applies (and inverts) the block-rotation step of the HexaRot cipher: the
 * grid is divided into pivotBlockSize x pivotBlockSize pivot blocks,
 * traversed in the order given by a ReadingOrderStrategy, each rotated
 * according to the rotation sequence (cycling if there are more blocks
 * than sequence entries).
 */
@Injectable()
export class RotationEngine {
  constructor(private readonly readingOrderRegistry: ReadingOrderRegistry) {}

  /** Applies the rotation sequence to every pivot block, in traversal order. */
  encode(
    grid: ColorGrid,
    pivotBlockSize: number,
    rotationSequence: RotationSequence,
    direction: RotationDirection,
    readingOrder: ReadingOrder,
  ): ColorGrid {
    return this.applyToBlocks(
      grid,
      pivotBlockSize,
      rotationSequence,
      direction,
      readingOrder,
      false,
    );
  }

  /**
   * Applies the inverse rotation sequence to every pivot block, in reverse
   * traversal order.
   */
  decode(
    grid: ColorGrid,
    pivotBlockSize: number,
    rotationSequence: RotationSequence,
    direction: RotationDirection,
    readingOrder: ReadingOrder,
  ): ColorGrid {
    return this.applyToBlocks(
      grid,
      pivotBlockSize,
      rotationSequence,
      direction,
      readingOrder,
      true,
    );
  }

  private applyToBlocks(
    grid: ColorGrid,
    pivotBlockSize: number,
    rotationSequence: RotationSequence,
    direction: RotationDirection,
    readingOrder: ReadingOrder,
    inverse: boolean,
  ): ColorGrid {
    const widthInBlocks = grid[0].length / pivotBlockSize;
    const heightInBlocks = grid.length / pivotBlockSize;
    const strategy = this.readingOrderRegistry.getStrategy(readingOrder);
    const blockOrder = strategy.getBlockOrder(widthInBlocks, heightInBlocks);

    const result: ColorGrid = grid.map((row) => [...row]);
    const effectiveDirection: RotationDirection = inverse
      ? direction === 'cw'
        ? 'ccw'
        : 'cw'
      : direction;

    const indices = [...blockOrder.keys()];
    const orderedIndices = inverse ? indices.reverse() : indices;

    for (const i of orderedIndices) {
      const { x, y } = blockOrder[i];
      const angle =
        ROTATION_ANGLES[rotationSequence[i % rotationSequence.length]];
      const caseX = x * pivotBlockSize;
      const caseY = y * pivotBlockSize;

      const block = extractBlock(grid, caseX, caseY, pivotBlockSize);
      const rotated = rotateBlock(block, angle, effectiveDirection);
      writeBlock(result, caseX, caseY, pivotBlockSize, rotated);
    }

    return result;
  }
}

function extractBlock(
  grid: ColorGrid,
  x: number,
  y: number,
  size: number,
): ColorGrid {
  const block: ColorGrid = [];
  for (let dy = 0; dy < size; dy++) {
    const row: string[] = [];
    for (let dx = 0; dx < size; dx++) {
      row.push(grid[y + dy][x + dx]);
    }
    block.push(row);
  }
  return block;
}

function writeBlock(
  grid: ColorGrid,
  x: number,
  y: number,
  size: number,
  block: ColorGrid,
): void {
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      grid[y + dy][x + dx] = block[dy][dx];
    }
  }
}
