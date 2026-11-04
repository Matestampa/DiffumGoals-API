const sharp = require('sharp');

const { validate_newGoal } = require('../../src/api/newGoal/validator.js');
const { DFLT_IMG_SIZE } = require('../../src/api/newGoal/const_vars.js');

// Days counted from "now", matching how the validator's own bounds are derived.
const MIN_LIMITDATE_DAYS = 15;
const MAX_LIMITDATE_DAYS = 90;
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const buildPngBuffer = (width, height) => sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 0, b: 0 } }
}).png().toBuffer();

describe('validate_newGoal', () => {
    let validImgFile;
    let validBody;

    beforeAll(async () => {
        validImgFile = {
            buffer: await buildPngBuffer(DFLT_IMG_SIZE.width, DFLT_IMG_SIZE.height),
            mimetype: 'image/png'
        };

        // Comfortably inside the [15,90] days window, away from both edges
        // (the window's bounds are computed once when the validator module is first
        // required, so values picked too close to an edge could flake depending on timing).
        validBody = {
            descr: 'A valid description',
            limit_date: daysFromNow(30)
        };
    });

    it('accepts valid fields and a valid image', async () => {
        const result = await validate_newGoal(validBody, validImgFile);
        expect(result.error).toBeUndefined();
    });

    describe('descr', () => {
        it('rejects a missing descr', async () => {
            const { descr, ...bodyWithoutDescr } = validBody;
            const result = await validate_newGoal(bodyWithoutDescr, validImgFile);
            expect(result.error).toBeDefined();
            expect(result.error.code).toBe('BAD_REQ');
        });

        it('rejects a descr shorter than 5 characters', async () => {
            const result = await validate_newGoal({ ...validBody, descr: 'abcd' }, validImgFile);
            expect(result.error).toBeDefined();
        });

        it('rejects a descr longer than 255 characters', async () => {
            const result = await validate_newGoal({ ...validBody, descr: 'a'.repeat(256) }, validImgFile);
            expect(result.error).toBeDefined();
        });

        it('accepts a descr of exactly 5 and 255 characters', async () => {
            const shortest = await validate_newGoal({ ...validBody, descr: 'abcde' }, validImgFile);
            const longest = await validate_newGoal({ ...validBody, descr: 'a'.repeat(255) }, validImgFile);
            expect(shortest.error).toBeUndefined();
            expect(longest.error).toBeUndefined();
        });
    });

    describe('limit_date', () => {
        it('rejects a missing limit_date', async () => {
            const { limit_date, ...bodyWithoutDate } = validBody;
            const result = await validate_newGoal(bodyWithoutDate, validImgFile);
            expect(result.error).toBeDefined();
        });

        it(`rejects a limit_date fewer than ${MIN_LIMITDATE_DAYS} days away`, async () => {
            const result = await validate_newGoal({ ...validBody, limit_date: daysFromNow(10) }, validImgFile);
            expect(result.error).toBeDefined();
            expect(result.error.message).toMatch(/must be at least 15 days/);
        });

        it(`rejects a limit_date more than ${MAX_LIMITDATE_DAYS} days away`, async () => {
            const result = await validate_newGoal({ ...validBody, limit_date: daysFromNow(100) }, validImgFile);
            expect(result.error).toBeDefined();
            expect(result.error.message).toMatch(/maximum of 90 days/);
        });

        it('rejects a limit_date in the past', async () => {
            const result = await validate_newGoal({ ...validBody, limit_date: daysFromNow(-5) }, validImgFile);
            expect(result.error).toBeDefined();
        });
    });

    describe('image', () => {
        it('rejects a missing image', async () => {
            const result = await validate_newGoal(validBody, undefined);
            expect(result.error).toBeDefined();
            expect(result.error.message).toBe('Image must be png');
        });

        it('rejects an image that is not a png', async () => {
            const jpegBuffer = await sharp({
                create: { width: DFLT_IMG_SIZE.width, height: DFLT_IMG_SIZE.height, channels: 3, background: { r: 255, g: 0, b: 0 } }
            }).jpeg().toBuffer();

            const result = await validate_newGoal(validBody, { buffer: jpegBuffer, mimetype: 'image/jpeg' });
            expect(result.error).toBeDefined();
            expect(result.error.message).toBe('Image must be png');
        });

        it('rejects a png with the wrong dimensions', async () => {
            const wrongSizeBuffer = await buildPngBuffer(50, 50);

            const result = await validate_newGoal(validBody, { buffer: wrongSizeBuffer, mimetype: 'image/png' });
            expect(result.error).toBeDefined();
            expect(result.error.message).toBe(`Image must be ${DFLT_IMG_SIZE.width}x${DFLT_IMG_SIZE.height}`);
        });

        it('only validates the image after the body fields are valid', async () => {
            // Invalid body + invalid image: the body (Joi) error should win, since the
            // image is only checked once the body schema passes.
            const result = await validate_newGoal({ ...validBody, descr: '' }, undefined);
            expect(result.error).toBeDefined();
            expect(result.error.message).not.toBe('Image must be png');
        });
    });
});