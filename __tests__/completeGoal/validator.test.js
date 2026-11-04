const sharp = require('sharp');

const { validate_completeGoal } = require('../../src/api/completeGoal/validator.js');
const { DFLT_IMG_SIZE } = require('../../src/api/completeGoal/const_vars.js');

const VALID_GOAL_ID = 'a'.repeat(24);

const buildPngBuffer = (width, height) => sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 0, b: 0 } }
}).png().toBuffer();

describe('validate_completeGoal', () => {
    let validImgFile;
    const validBody = { goal_id: VALID_GOAL_ID };

    beforeAll(async () => {
        validImgFile = {
            buffer: await buildPngBuffer(DFLT_IMG_SIZE.width, DFLT_IMG_SIZE.height),
            mimetype: 'image/png'
        };
    });

    it('accepts a valid goal_id and a valid image', async () => {
        const result = await validate_completeGoal(validBody, validImgFile);
        expect(result.error).toBeUndefined();
    });

    describe('goal_id', () => {
        it('rejects a missing goal_id', async () => {
            const result = await validate_completeGoal({}, validImgFile);
            expect(result.error).toBeDefined();
            expect(result.error.code).toBe('BAD_REQ');
        });

        it('rejects a goal_id that is not hexadecimal', async () => {
            const result = await validate_completeGoal({ goal_id: 'z'.repeat(24) }, validImgFile);
            expect(result.error).toBeDefined();
            expect(result.error.code).toBe('BAD_REQ');
        });

        it('rejects a goal_id shorter than 24 characters', async () => {
            const result = await validate_completeGoal({ goal_id: 'a'.repeat(23) }, validImgFile);
            expect(result.error).toBeDefined();
        });

        it('rejects a goal_id longer than 24 characters', async () => {
            const result = await validate_completeGoal({ goal_id: 'a'.repeat(25) }, validImgFile);
            expect(result.error).toBeDefined();
        });

        it('rejects a goal_id that is not a string', async () => {
            const result = await validate_completeGoal({ goal_id: 123 }, validImgFile);
            expect(result.error).toBeDefined();
        });

        it('rejects unknown extra fields in the body', async () => {
            const result = await validate_completeGoal({ ...validBody, extra: 'x' }, validImgFile);
            expect(result.error).toBeDefined();
            expect(result.error.code).toBe('BAD_REQ');
        });
    });

    describe('image', () => {
        it('rejects a missing image', async () => {
            const result = await validate_completeGoal(validBody, undefined);
            expect(result.error).toBeDefined();
            expect(result.error.code).toBe('BAD_REQ');
            expect(result.error.message).toBe('Image must be png');
        });

        it('rejects an image that is not a png', async () => {
            const jpegBuffer = await sharp({
                create: { width: DFLT_IMG_SIZE.width, height: DFLT_IMG_SIZE.height, channels: 3, background: { r: 255, g: 0, b: 0 } }
            }).jpeg().toBuffer();

            const result = await validate_completeGoal(validBody, { buffer: jpegBuffer, mimetype: 'image/jpeg' });
            expect(result.error).toBeDefined();
            expect(result.error.message).toBe('Image must be png');
        });

        it('rejects a png with the wrong dimensions', async () => {
            const wrongSizeBuffer = await buildPngBuffer(50, 50);

            const result = await validate_completeGoal(validBody, { buffer: wrongSizeBuffer, mimetype: 'image/png' });
            expect(result.error).toBeDefined();
            expect(result.error.message).toBe(`Image must be ${DFLT_IMG_SIZE.width}x${DFLT_IMG_SIZE.height}`);
        });

        it('only validates the image after the body fields are valid', async () => {
            // Invalid body + invalid image: the body (Joi) error should win, since the
            // image is only checked once the body schema passes.
            const result = await validate_completeGoal({ goal_id: 'nope' }, undefined);
            expect(result.error).toBeDefined();
            expect(result.error.message).not.toBe('Image must be png');
        });
    });
});
