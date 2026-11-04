const sharp = require('sharp');

const { newGoal_Service } = require('../../src/api/newGoal/service/newGoalService.js');
const { GOALS_LOGIC_VARS } = require('../../src/config/app_config.js');
const { GoalModel } = require('../../src/db/mongodb');

const {
    connectTestDb, disconnectTestDb, clearGoals, newObjectId, buildGoal, seedGoals
} = require('../test_utils.js');

// Only S3 and CloudFront (real AWS/network calls) are mocked. AWS_GEN_ERRORS is kept real,
// since the error handler relies on `instanceof` checks against it.
jest.mock('../../src/aws_services', () => {
    const actual = jest.requireActual('../../src/aws_services');
    return {
        ...actual,
        S3_FUNCS: { saveObject: jest.fn() },
        CLOUDFRONT: { get_SignedUrl: jest.fn() }
    };
});

// Only the logging side effect of the error handler is silenced, the DB and the error handler are real
jest.mock('../../src/logs/loggers.js', () => ({
    infoLogger: { info: jest.fn() },
    errorLogger: { error: jest.fn() }
}));

const { S3_FUNCS, CLOUDFRONT } = require('../../src/aws_services');
const { AWS_GEN_ERRORS } = jest.requireActual('../../src/aws_services');

const USER_LIMIT = Number(GOALS_LOGIC_VARS.user_limit);
const GLOBAL_LIMIT = Number(GOALS_LOGIC_VARS.global_limit);

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearGoals);

beforeEach(() => {
    jest.clearAllMocks();
    S3_FUNCS.saveObject.mockResolvedValue(undefined);
    CLOUDFRONT.get_SignedUrl.mockImplementation((key) => `https://signed.test/${key}`);
});

const buildImgBuffer = () => sharp({
    create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } }
}).png().toBuffer();

describe('newGoal_Service', () => {
    const userId = newObjectId();
    const username = 'tester';
    const descr = 'A sample goal description';
    const limitDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    it('saves the image to S3, the goal to MongoDB, and returns the goal_id and a signed img_url', async () => {
        const imgBuffer = await buildImgBuffer();

        const result = await newGoal_Service(userId.toString(), username, descr, limitDate, imgBuffer);

        expect(result.error).toBeNull();
        expect(result.data).toHaveProperty('goal_id');
        expect(result.data.img_url).toEqual(expect.stringContaining('https://signed.test/'));

        // S3: once for the "original" image, once for the "latest" image
        expect(S3_FUNCS.saveObject).toHaveBeenCalledTimes(2);
        const [originalCall, latestCall] = S3_FUNCS.saveObject.mock.calls;
        expect(originalCall[0]).toEqual(expect.stringContaining('_original'));
        expect(originalCall[2]).toBe('image/png');
        expect(latestCall[2]).toBe('image/png');

        // CloudFront was signed for the "latest" image name used in img_url
        expect(CLOUDFRONT.get_SignedUrl).toHaveBeenCalledWith(latestCall[0], expect.any(Date));

        // The goal was actually persisted
        const savedGoal = await GoalModel.findById(result.data.goal_id).lean();
        expect(savedGoal).not.toBeNull();
        expect(savedGoal).toMatchObject({
            user_id: userId,
            username,
            descr,
            completed: false,
            s3_imgName_original: originalCall[0],
            s3_imgName_latest: latestCall[0]
        });
        expect(savedGoal.limit_date.toISOString()).toBe(limitDate.toISOString());
        expect(Number.isInteger(savedGoal.cant_pix_xday)).toBe(true);
        expect(savedGoal.cant_pix_xday).toBeGreaterThan(0);
    });

    it(`fails with BAD_REQ when the user already has ${USER_LIMIT} goals, without calling S3`, async () => {
        const existingGoals = Array.from({ length: USER_LIMIT }, () => buildGoal({ user_id: userId }));
        await seedGoals(existingGoals);

        const imgBuffer = await buildImgBuffer();
        const result = await newGoal_Service(userId.toString(), username, descr, limitDate, imgBuffer);

        expect(result.data).toBeNull();
        expect(result.error).toMatchObject({ code: 'BAD_REQ', message: "User's Goals Limit Reached" });
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });

    it(`fails with BAD_REQ when the global goal count has reached ${GLOBAL_LIMIT}, without calling S3`, async () => {
        // Spread across distinct users so the per-user limit isn't hit first
        const existingGoals = Array.from({ length: GLOBAL_LIMIT }, () => buildGoal());
        await seedGoals(existingGoals);

        const imgBuffer = await buildImgBuffer();
        const result = await newGoal_Service(userId.toString(), username, descr, limitDate, imgBuffer);

        expect(result.data).toBeNull();
        expect(result.error).toMatchObject({ code: 'BAD_REQ', message: 'Goals Limit Reached' });
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    }, 20000);

    it('handles an S3 failure, returns a server error and does not persist the goal', async () => {
        S3_FUNCS.saveObject.mockRejectedValueOnce(new AWS_GEN_ERRORS.AwsService_Unknown_Error('', new Error('boom'), 'S3'));

        const imgBuffer = await buildImgBuffer();
        const result = await newGoal_Service(userId.toString(), username, descr, limitDate, imgBuffer);

        expect(result.data).toBeNull();
        expect(result.error).toMatchObject({ code: 'SERVER' });
        expect(await GoalModel.countDocuments()).toBe(0);
    });

    it('handles a MongoDB validation error, returns a server error, after S3 was already called', async () => {

        const imgBuffer = await buildImgBuffer();

        // user_id stays valid (so the goal-limit checks pass and S3 gets called); omitting the
        // required `username` field instead forces a real Mongoose ValidationError on save.
        const result = await newGoal_Service(userId.toString(), undefined, descr, limitDate, imgBuffer);

        expect(result.data).toBeNull();
        expect(result.error).toMatchObject({ code: 'SERVER' });
        expect(S3_FUNCS.saveObject).toHaveBeenCalledTimes(2);
        expect(await GoalModel.countDocuments()).toBe(0);
    });
});
