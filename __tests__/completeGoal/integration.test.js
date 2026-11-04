const supertest = require('supertest');
const sharp = require('sharp');

const { App } = require('../../src/app.js');
const { DFLT_IMG_SIZE } = require('../../src/api/completeGoal/const_vars.js');
const { GoalModel } = require('../../src/db/mongodb');

const {
    connectTestDb, disconnectTestDb, clearGoals, newObjectId, buildAuthCookie,
    buildGoal, buildCompletedGoal, buildExpiredGoal, seedGoals
} = require('../test_utils.js');

// Only S3 (real AWS calls) is mocked; the validator and service run for real.
jest.mock('../../src/aws_services', () => {
    const actual = jest.requireActual('../../src/aws_services');
    return {
        ...actual,
        S3_FUNCS: { saveObject: jest.fn() }
    };
});

// Only the logging side effect of the error handler is silenced, the DB, validator and service are real
jest.mock('../../src/logs/loggers.js', () => ({
    infoLogger: { info: jest.fn() },
    errorLogger: { error: jest.fn() }
}));

const { S3_FUNCS } = require('../../src/aws_services');
const { AWS_GEN_ERRORS } = jest.requireActual('../../src/aws_services');

const api = supertest(App);
const ENDPOINT = '/goals/complete';

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearGoals);

beforeEach(() => {
    jest.clearAllMocks();
    S3_FUNCS.saveObject.mockResolvedValue(undefined);
});

function postCompleteGoal({ fields = {}, file, cookie } = {}) {
    const req = api.post(ENDPOINT);

    if (cookie) req.set('Cookie', cookie);

    Object.entries(fields).forEach(([key, value]) => req.field(key, value));

    if (file) req.attach('img', file.buffer, file.filename);

    return req;
}

describe('POST /goals/complete', () => {
    let validImgBuffer;
    let validFile;
    const userId = newObjectId();

    beforeAll(async () => {
        validImgBuffer = await sharp({
            create: {
                width: DFLT_IMG_SIZE.width,
                height: DFLT_IMG_SIZE.height,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
            }
        }).png().toBuffer();

        validFile = { buffer: validImgBuffer, filename: 'completed.png' };
    });

    it('completes the goal and returns a 200 with the goal_id', async () => {
        const [goal] = await seedGoals([buildGoal({ user_id: userId })]);
        const goalId = goal._id.toString();

        const response = await postCompleteGoal({
            fields: { goal_id: goalId },
            file: validFile,
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(200);
        expect(response.body.data).toEqual({ goal_id: goalId });

        expect(S3_FUNCS.saveObject).toHaveBeenCalledTimes(1);
        expect(S3_FUNCS.saveObject.mock.calls[0][0]).toBe(`${goalId}_s3_completed`);

        const savedGoal = await GoalModel.findById(goalId).lean();
        expect(savedGoal.completed).toBe(true);
        expect(savedGoal.s3_imgName_completed).toBe(`${goalId}_s3_completed`);
        expect(savedGoal.completed_date).toBeInstanceOf(Date);
    });

    it('responds with 401 NOT_AUTH when there is no auth cookie', async () => {
        const [goal] = await seedGoals([buildGoal({ user_id: userId })]);

        const response = await postCompleteGoal({
            fields: { goal_id: goal._id.toString() },
            file: validFile
        });

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('NOT_AUTH');
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });

    it('responds with 404 BAD_REQ for an invalid goal_id', async () => {
        const response = await postCompleteGoal({
            fields: { goal_id: 'not-valid' },
            file: validFile,
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('BAD_REQ');
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });

    it('responds with 404 BAD_REQ when the goal_id is missing', async () => {
        const response = await postCompleteGoal({
            file: validFile,
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('BAD_REQ');
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });

    it('responds with 404 BAD_REQ when the image is missing', async () => {
        const [goal] = await seedGoals([buildGoal({ user_id: userId })]);

        const response = await postCompleteGoal({
            fields: { goal_id: goal._id.toString() },
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('BAD_REQ');
        expect(response.body.error.message).toBe('Image must be png');
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });

    it('responds with 404 BAD_REQ when the image has the wrong dimensions', async () => {
        const [goal] = await seedGoals([buildGoal({ user_id: userId })]);
        const wrongSizeBuffer = await sharp({
            create: { width: 50, height: 50, channels: 3, background: { r: 255, g: 0, b: 0 } }
        }).png().toBuffer();

        const response = await postCompleteGoal({
            fields: { goal_id: goal._id.toString() },
            file: { buffer: wrongSizeBuffer, filename: 'completed.png' },
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('BAD_REQ');
        expect(response.body.error.message).toEqual(expect.stringContaining('Image must be'));
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });

    it('responds with 404 BAD_REQ when the goal does not exist', async () => {
        const response = await postCompleteGoal({
            fields: { goal_id: newObjectId().toString() },
            file: validFile,
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('BAD_REQ');
        expect(response.body.error.message).toBe('Goal not found');
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });

    it('responds with 401 NOT_AUTH when the goal belongs to another user', async () => {
        const [goal] = await seedGoals([buildGoal({ user_id: newObjectId() })]);

        const response = await postCompleteGoal({
            fields: { goal_id: goal._id.toString() },
            file: validFile,
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('NOT_AUTH');
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();

        const savedGoal = await GoalModel.findById(goal._id).lean();
        expect(savedGoal.completed).toBe(false);
    });

    it('responds with 404 BAD_REQ when the goal has expired', async () => {
        const [goal] = await seedGoals([buildExpiredGoal({ user_id: userId })]);

        const response = await postCompleteGoal({
            fields: { goal_id: goal._id.toString() },
            file: validFile,
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('BAD_REQ');
        expect(response.body.error.message).toBe('Goal has expired and cannot be completed');
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });

    it('responds with 404 BAD_REQ when the goal is already completed', async () => {
        const [goal] = await seedGoals([buildCompletedGoal({ user_id: userId })]);

        const response = await postCompleteGoal({
            fields: { goal_id: goal._id.toString() },
            file: validFile,
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('BAD_REQ');
        expect(response.body.error.message).toBe('Goal is already completed');
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });

    it('responds with 500 SERVER when S3 fails, and does not mark the goal as completed', async () => {
        const [goal] = await seedGoals([buildGoal({ user_id: userId })]);
        S3_FUNCS.saveObject.mockRejectedValueOnce(new AWS_GEN_ERRORS.AwsService_Unknown_Error('', new Error('S3 is down'), 'S3'));

        const response = await postCompleteGoal({
            fields: { goal_id: goal._id.toString() },
            file: validFile,
            cookie: buildAuthCookie(userId)
        });

        expect(response.status).toBe(500);
        expect(response.body.error.code).toBe('SERVER');

        const savedGoal = await GoalModel.findById(goal._id).lean();
        expect(savedGoal.completed).toBe(false);
    });
});
