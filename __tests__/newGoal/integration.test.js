const supertest = require('supertest');
const sharp = require('sharp');

const { App } = require('../../src/app.js');
const { GOALS_LOGIC_VARS } = require('../../src/config/app_config.js');
const { DFLT_IMG_SIZE } = require('../../src/api/newGoal/const_vars.js');
const { GoalModel } = require('../../src/db/mongodb');

const {
    connectTestDb, disconnectTestDb, clearGoals, newObjectId, buildAuthCookie, buildGoal, seedGoals
} = require('../test_utils.js');

// Only S3 and CloudFront (real AWS/network calls) are mocked; the validator and service run for real.
jest.mock('../../src/aws_services', () => {
    const actual = jest.requireActual('../../src/aws_services');
    return {
        ...actual,
        S3_FUNCS: { saveObject: jest.fn() },
        CLOUDFRONT: { get_SignedUrl: jest.fn() }
    };
});

// Only the logging side effect of the error handler is silenced, the DB, validator and service are real
jest.mock('../../src/logs/loggers.js', () => ({
    infoLogger: { info: jest.fn() },
    errorLogger: { error: jest.fn() }
}));

const { S3_FUNCS, CLOUDFRONT } = require('../../src/aws_services');
const { AWS_GEN_ERRORS } = jest.requireActual('../../src/aws_services');

const api = supertest(App);
const ENDPOINT = '/goals/new';
const USER_LIMIT = Number(GOALS_LOGIC_VARS.user_limit);

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearGoals);

beforeEach(() => {
    jest.clearAllMocks();
    S3_FUNCS.saveObject.mockResolvedValue(undefined);
    CLOUDFRONT.get_SignedUrl.mockImplementation((key) => `https://signed.test/${key}`);
});

function postNewGoal({ fields = {}, file, cookie } = {}) {
    const req = api.post(ENDPOINT);

    if (cookie) req.set('Cookie', cookie);

    Object.entries(fields).forEach(([key, value]) => req.field(key, value));

    if (file) req.attach('img', file.buffer, file.filename);

    return req;
}

describe('POST /goals/new', () => {
    let validImgBuffer;
    const userId = newObjectId();
    const validFields = {
        descr: 'A brand new goal',
        limit_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    beforeAll(async () => {
        validImgBuffer = await sharp({
            create: {
                width: DFLT_IMG_SIZE.width,
                height: DFLT_IMG_SIZE.height,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
            }
        }).png().toBuffer();
    });

    it('creates the goal and returns a 200 with the goal_id and img_url', async () => {
        const response = await postNewGoal({
            fields: validFields,
            file: { buffer: validImgBuffer, filename: 'goal.png' },
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('goal_id');
        expect(response.body.data.img_url).toEqual(expect.stringContaining('https://signed.test/'));

        const savedGoal = await GoalModel.findById(response.body.data.goal_id).lean();
        expect(savedGoal).toMatchObject({
            user_id: userId,
            descr: validFields.descr,
            completed: false
        });
        expect(S3_FUNCS.saveObject).toHaveBeenCalledTimes(2);
    });

    it('responds with 401 NOT_AUTH when there is no auth cookie', async () => {
        const response = await postNewGoal({
            fields: validFields,
            file: { buffer: validImgBuffer, filename: 'goal.png' }
        });

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('NOT_AUTH');
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });

    it('responds with 404 BAD_REQ for an invalid body (descr too short)', async () => {
        const response = await postNewGoal({
            fields: { ...validFields, descr: 'no' },
            file: { buffer: validImgBuffer, filename: 'goal.png' },
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('BAD_REQ');
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });

    it('responds with 404 BAD_REQ when the image is missing', async () => {
        const response = await postNewGoal({
            fields: validFields,
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('BAD_REQ');
        expect(response.body.error.message).toBe('Image must be png');
    });

    it('responds with 404 BAD_REQ when the image has the wrong dimensions', async () => {
        const wrongSizeBuffer = await sharp({
            create: { width: 50, height: 50, channels: 3, background: { r: 255, g: 0, b: 0 } }
        }).png().toBuffer();

        const response = await postNewGoal({
            fields: validFields,
            file: { buffer: wrongSizeBuffer, filename: 'goal.png' },
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('BAD_REQ');
        expect(response.body.error.message).toEqual(expect.stringContaining('Image must be'));
    });

    it(`responds with 404 BAD_REQ when the user already has ${USER_LIMIT} goals`, async () => {
        await seedGoals(Array.from({ length: USER_LIMIT }, () => buildGoal({ user_id: userId })));

        const response = await postNewGoal({
            fields: validFields,
            file: { buffer: validImgBuffer, filename: 'goal.png' },
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('BAD_REQ');
        expect(response.body.error.message).toBe("User's Goals Limit Reached");
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });

    it('responds with 500 SERVER when S3 fails, and does not persist the goal', async () => {
        S3_FUNCS.saveObject.mockRejectedValueOnce(new AWS_GEN_ERRORS.AwsService_Unknown_Error('', new Error('S3 is down'), 'S3'));

        const response = await postNewGoal({
            fields: validFields,
            file: { buffer: validImgBuffer, filename: 'goal.png' },
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(500);
        expect(response.body.error.code).toBe('SERVER');
        expect(await GoalModel.countDocuments()).toBe(0);
    });
});
