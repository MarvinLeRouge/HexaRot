import { KeyCodec } from '../../src/key/key-codec';

export const VALID_ENCODE_BODY = {
  message: 'ABC',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
};

export const VALID_KEY_STRING = KeyCodec.encode({
  version: 1,
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
});

export const VALID_ENCODE_BODY_WITH_KEY = {
  message: 'ABC',
  key: VALID_KEY_STRING,
};

export const WEAK_ENCODE_BODY = {
  message: 'ABC',
  pivotBlockSize: 2,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
};

export const ENCODE_BODY_WITH_UNKNOWN_CHARS = {
  message: 'ABXYZ',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
};

export const MALFORMED_KEY_STRINGS = [
  '',
  'not-a-key',
  'HR2.0000',
  'HR1-0000',
  'HR1.ABC',
  'HR1·ZZZZ', // structurally valid, but unpacks to an out-of-range rotation sequence index (26, only 0-23 exist)
  'HR1·0000', // structurally valid, but unpacks to pivotBlockSize=0, which buildGrid rejects
];
