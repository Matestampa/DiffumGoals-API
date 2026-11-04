const sharp = require('sharp');

const {
    completeGoal_Service, validate_completeGoalOperation
} = require('../../src/api/completeGoal/service/completeGoalService.js');
const { GoalModel } = require('../../src/db/mongodb');

const {
    connectTestDb, disconnectTestDb, clearGoals, newObjectId, buildGoal, buildCompletedGoal, buildExpiredGoal, seedGoals
} = require('../test_utils.js');

// Only S3 (real AWS calls) is mocked. AWS_GEN_ERRORS is kept real,
// since the error handler relies on `instanceof` checks against it.
jest.mock('../../src/aws_services', () => {
    const actual = jest.requireActual('../../src/aws_services');
    return {
        ...actual,
        S3_FUNCS: { saveObject: jest.fn() }
    };
});

// Only the logging side effect of the error handler is silenced, the DB and the error handler are real
jest.mock('../../src/logs/loggers.js', () => ({
    infoLogger: { info: jest.fn() },
    errorLogger: { error: jest.fn() }
}));

const { S3_FUNCS } = require('../../src/aws_services');
const { AWS_GEN_ERRORS } = jest.requireActual('../../src/aws_services');

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearGoals);

beforeEach(() => {
    jest.clearAllMocks();
    S3_FUNCS.saveObject.mockResolvedValue(undefined);
});

const buildImgBuffer = () => sharp({
    create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } }
}).png().toBuffer();

describe('validate_completeGoalOperation', () => {
    const userId = newObjectId();

    // Plain objects are enough: the function only reads user_id, expired and completed
    const buildGoalData = (overrides = {}) => ({
        user_id: userId,
        expired: false,
        completed: false,
        ...overrides
    });

    it('returns no error when the goal belongs to the user and is neither expired nor completed', () => {
        const result = validate_completeGoalOperation(buildGoalData(), userId.toString());
        expect(result).toEqual({ error: null });
    });

    it('returns BAD_REQ when the goal does not exist (null)', () => {
        const { error } = validate_completeGoalOperation(null, userId.toString());
        expect(error).toMatchObject({ code: 'BAD_REQ', message: 'Goal not found' });
    });

    it('returns BAD_REQ when the goal does not exist (undefined)', () => {
        const { error } = validate_completeGoalOperation(undefined, userId.toString());
        expect(error).toMatchObject({ code: 'BAD_REQ', message: 'Goal not found' });
    });

    it('returns NOT_AUTH when the goal belongs to another user', () => {
        const { error } = validate_completeGoalOperation(buildGoalData(), newObjectId().toString());
        expect(error).toMatchObject({
            code: 'NOT_AUTH',
            message: 'You do not have permission to complete this goal'
        });
    });

    it('returns BAD_REQ when the goal has expired', () => {
        const { error } = validate_completeGoalOperation(buildGoalData({ expired: true }), userId.toString());
        expect(error).toMatchObject({ code: 'BAD_REQ', message: 'Goal has expired and cannot be completed' });
    });

    it('returns BAD_REQ when the goal is already completed', () => {
        const { error } = validate_completeGoalOperation(buildGoalData({ completed: true }), userId.toString());
        expect(error).toMatchObject({ code: 'BAD_REQ', message: 'Goal is already completed' });
    });

    it('checks ownership before expiration/completion status', () => {
        const goalData = buildGoalData({ expired: true, completed: true });
        const { error } = validate_completeGoalOperation(goalData, newObjectId().toString());
        expect(error.code).toBe('NOT_AUTH');
    });

    it('checks expiration before completion status', () => {
        const goalData = buildGoalData({ expired: true, completed: true });
        const { error } = validate_completeGoalOperation(goalData, userId.toString());
        expect(error.message).toBe('Goal has expired and cannot be completed');
    });
});

describe('completeGoal_Service', () => {
    const userId = newObjectId();

    it('saves the image to S3, marks the goal as completed in MongoDB, and returns the goal_id', async () => {
        const [goal] = await seedGoals([buildGoal({ user_id: userId })]);
        const goalId = goal._id.toString();
        const imgBuffer = await buildImgBuffer();
        const before = new Date();

        const result = await completeGoal_Service(userId.toString(), goalId, imgBuffer);

        expect(result).toEqual({ error: null, data: { goal_id: goalId } });

        // S3 was called once, with the completed image name, the buffer and the png content type
        expect(S3_FUNCS.saveObject).toHaveBeenCalledTimes(1);
        const [imgName, buffer, contentType] = S3_FUNCS.saveObject.mock.calls[0];
        expect(imgName).toBe(`${goalId}_s3_completed`);
        expect(buffer).toBe(imgBuffer);
        expect(contentType).toBe('image/png');

        // The goal was actually updated
        const savedGoal = await GoalModel.findById(goalId).lean();
        expect(savedGoal.completed).toBe(true);
        expect(savedGoal.s3_imgName_completed).toBe(imgName);
        expect(savedGoal.completed_date.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(savedGoal.completed_date.getTime()).toBeLessThanOrEqual(Date.now());

        // Untouched fields stay as they were
        expect(savedGoal.descr).toBe(goal.descr);
        expect(savedGoal.s3_imgName_original).toBe(goal.s3_imgName_original);
        expect(savedGoal.s3_imgName_latest).toBe(goal.s3_imgName_latest);
        expect(savedGoal.expired).toBe(false);
    });

    it('fails with BAD_REQ when the goal does not exist, without calling S3', async () => {
        const result = await completeGoal_Service(userId.toString(), newObjectId().toString(), await buildImgBuffer());

        expect(result.data).toBeNull();
        expect(result.error).toMatchObject({ code: 'BAD_REQ', message: 'Goal not found' });
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });

    it('fails with NOT_AUTH when the goal belongs to another user, without calling S3 or modifying the goal', async () => {
        const [goal] = await seedGoals([buildGoal({ user_id: newObjectId() })]);

        const result = await completeGoal_Service(userId.toString(), goal._id.toString(), await buildImgBuffer());

        expect(result.data).toBeNull();
        expect(result.error).toMatchObject({ code: 'NOT_AUTH' });
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();

        const savedGoal = await GoalModel.findById(goal._id).lean();
        expect(savedGoal.completed).toBe(false);
    });

    it('fails with BAD_REQ when the goal has expired, without calling S3', async () => {
        const [goal] = await seedGoals([buildExpiredGoal({ user_id: userId })]);

        const result = await completeGoal_Service(userId.toString(), goal._id.toString(), await buildImgBuffer());

        expect(result.data).toBeNull();
        expect(result.error).toMatchObject({ code: 'BAD_REQ', message: 'Goal has expired and cannot be completed' });
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });

    it('fails with BAD_REQ when the goal is already completed, without calling S3 or changing it', async () => {
        const [goal] = await seedGoals([buildCompletedGoal({ user_id: userId })]);

        const result = await completeGoal_Service(userId.toString(), goal._id.toString(), await buildImgBuffer());

        expect(result.data).toBeNull();
        expect(result.error).toMatchObject({ code: 'BAD_REQ', message: 'Goal is already completed' });
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();

        const savedGoal = await GoalModel.findById(goal._id).lean();
        expect(savedGoal.s3_imgName_completed).toBe(goal.s3_imgName_completed);
        expect(savedGoal.completed_date.toISOString()).toBe(goal.completed_date.toISOString());
    });

    it('handles an S3 failure, returns a server error and does not mark the goal as completed', async () => {
        const [goal] = await seedGoals([buildGoal({ user_id: userId })]);
        S3_FUNCS.saveObject.mockRejectedValueOnce(new AWS_GEN_ERRORS.AwsService_Unknown_Error('', new Error('boom'), 'S3'));

        const result = await completeGoal_Service(userId.toString(), goal._id.toString(), await buildImgBuffer());

        expect(result.data).toBeNull();
        expect(result.error).toMatchObject({ code: 'SERVER' });

        const savedGoal = await GoalModel.findById(goal._id).lean();
        expect(savedGoal.completed).toBe(false);
        expect(savedGoal.s3_imgName_completed).toBeFalsy();
        expect(savedGoal.completed_date).toBeFalsy();
    });

    it('handles a MongoDB error (invalid goal id), returns a server error without calling S3', async () => {
        const result = await completeGoal_Service(userId.toString(), 'not-an-object-id', await buildImgBuffer());

        expect(result.data).toBeNull();
        expect(result.error).toMatchObject({ code: 'SERVER' });
        expect(S3_FUNCS.saveObject).not.toHaveBeenCalled();
    });
});
