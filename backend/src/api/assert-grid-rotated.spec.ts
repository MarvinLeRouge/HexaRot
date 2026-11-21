import { BadRequestException } from '@nestjs/common';
import { assertGridRotated } from './assert-grid-rotated';

describe('assertGridRotated', () => {
  it('throws when every angle the grid uses is 0°, even if later angles are not', () => {
    expect(() => assertGridRotated(3, [0, 0, 0, 0, 1])).toThrow(
      BadRequestException,
    );
  });

  it('throws for a single-block grid whose first angle is 0°', () => {
    expect(() => assertGridRotated(1, [0, 1, 2, 3])).toThrow(/in clear/);
  });

  it('names how many leading angles the grid uses', () => {
    expect(() => assertGridRotated(3, [0, 0, 0, 0, 1])).toThrow(
      /first 3 entries/,
    );
  });

  it('passes when at least one block the grid uses gets a non-zero angle', () => {
    expect(() => assertGridRotated(3, [0, 0, 2, 0, 0])).not.toThrow();
  });

  it('passes when the grid has at least as many blocks as the sequence has angles', () => {
    expect(() => assertGridRotated(5, [0, 0, 0, 0, 1])).not.toThrow();
    expect(() => assertGridRotated(40, [0, 0, 0, 3])).not.toThrow();
  });
});
