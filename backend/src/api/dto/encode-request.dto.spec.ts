import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EncodeRequestDto } from './encode-request.dto';

async function validateBody(body: Record<string, unknown>) {
  const dto = plainToInstance(EncodeRequestDto, body);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

const VALID_PARAMS_BODY = {
  message: 'ABC',
  pivotBlockSize: 5,
  rotationSequence: [0, 1, 2, 3],
  rotationDirection: 'cw',
  readingOrder: 'LR-TB',
};

describe('EncodeRequestDto', () => {
  describe('valid bodies', () => {
    it('passes with a fully specified individual-params body', async () => {
      const errors = await validateBody(VALID_PARAMS_BODY);
      expect(errors).toHaveLength(0);
    });

    it('passes with only message and key (individual params omitted)', async () => {
      const errors = await validateBody({ message: 'ABC', key: 'HR1·0000' });
      expect(errors).toHaveLength(0);
    });

    it('passes with size and overrideWeaknessWarning provided', async () => {
      const errors = await validateBody({
        ...VALID_PARAMS_BODY,
        size: 'large',
        overrideWeaknessWarning: true,
      });
      expect(errors).toHaveLength(0);
    });

    it.each(['small', 'medium', 'large'])(
      'accepts size value %s',
      async (size) => {
        const errors = await validateBody({ ...VALID_PARAMS_BODY, size });
        expect(errors).toHaveLength(0);
      },
    );
  });

  describe('message validation', () => {
    it('fails when message is missing', async () => {
      const { message, ...rest } = VALID_PARAMS_BODY;
      void message;
      const errors = await validateBody(rest);
      expect(errors.some((e) => e.property === 'message')).toBe(true);
    });

    it('fails when message is an empty string', async () => {
      const errors = await validateBody({ ...VALID_PARAMS_BODY, message: '' });
      expect(errors.some((e) => e.property === 'message')).toBe(true);
    });
  });

  describe('individual params required only when key is absent', () => {
    it('fails when pivotBlockSize is missing and no key is provided', async () => {
      const { pivotBlockSize, ...rest } = VALID_PARAMS_BODY;
      void pivotBlockSize;
      const errors = await validateBody(rest);
      expect(errors.some((e) => e.property === 'pivotBlockSize')).toBe(true);
    });

    it('does not require pivotBlockSize when key is provided', async () => {
      const errors = await validateBody({ message: 'ABC', key: 'HR1·0000' });
      expect(errors.some((e) => e.property === 'pivotBlockSize')).toBe(false);
    });

    it('fails when pivotBlockSize exceeds 255', async () => {
      const errors = await validateBody({
        ...VALID_PARAMS_BODY,
        pivotBlockSize: 256,
      });
      expect(errors.some((e) => e.property === 'pivotBlockSize')).toBe(true);
    });

    it('fails when rotationDirection is not cw or ccw (no key provided)', async () => {
      const errors = await validateBody({
        ...VALID_PARAMS_BODY,
        rotationDirection: 'sideways',
      });
      expect(errors.some((e) => e.property === 'rotationDirection')).toBe(true);
    });

    it('does not validate rotationDirection when key is provided', async () => {
      const errors = await validateBody({
        message: 'ABC',
        key: 'HR1·0000',
        rotationDirection: 'sideways',
      });
      expect(errors.some((e) => e.property === 'rotationDirection')).toBe(
        false,
      );
    });

    it('fails when readingOrder is not a known value (no key provided)', async () => {
      const errors = await validateBody({
        ...VALID_PARAMS_BODY,
        readingOrder: 'DIAGONAL',
      });
      expect(errors.some((e) => e.property === 'readingOrder')).toBe(true);
    });

    it('fails when rotationSequence does not have exactly 4 entries', async () => {
      const errors = await validateBody({
        ...VALID_PARAMS_BODY,
        rotationSequence: [0, 1, 2],
      });
      expect(errors.some((e) => e.property === 'rotationSequence')).toBe(true);
    });
  });

  describe('other fields', () => {
    it('fails when size is not small, medium, or large', async () => {
      const errors = await validateBody({ ...VALID_PARAMS_BODY, size: 'huge' });
      expect(errors.some((e) => e.property === 'size')).toBe(true);
    });

    it('fails when extra fields are present (strict DTO)', async () => {
      const errors = await validateBody({
        ...VALID_PARAMS_BODY,
        extraField: 'not allowed',
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
