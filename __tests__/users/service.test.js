const jwt = require('jsonwebtoken');

const { googleOAuth_Service } = require('../../src/api/users/service/usersService.js');
const { UserModel } = require('../../src/db/mongodb');
const { AUTH_VARS } = require('../../src/config/app_config.js');

const { connectTestDb, disconnectTestDb, clearUsers } = require('../test_utils.js');

// Only the logging side effect of the error handler is silenced, the DB and the error handler are real
jest.mock('../../src/logs/loggers.js', () => ({
    infoLogger: { info: jest.fn() },
    errorLogger: { error: jest.fn() }
}));

const buildProfile = (overrides = {}) => ({
    id: '1234567890',
    displayName: 'John Doe',
    emails: [{ value: 'john.doe@example.com' }],
    ...overrides
});

beforeAll(async () => {
    await connectTestDb();
    await UserModel.init();
});
afterAll(disconnectTestDb);
beforeEach(clearUsers);
afterEach(() => jest.restoreAllMocks());

describe('googleOAuth_Service', () => {

    describe('new user', () => {
        it('creates the user with the google provider data and returns its id and username', async () => {
            const { error, data } = await googleOAuth_Service(buildProfile());

            expect(error).toBeNull();
            const users = await UserModel.find({});
            expect(users).toHaveLength(1);
            expect(users[0]).toMatchObject({
                username: 'John_Doe',
                provider_type: 'google',
                provider_id: 'google_1234567890',
                email: 'john.doe@example.com'
            });
            expect(data.user_id.toString()).toBe(users[0]._id.toString());
            expect(data.username).toBe('John_Doe');
        });

        it('returns a valid JWT with the user id and username that expires after JWT_EXPIRATION_MS', async () => {
            const { data } = await googleOAuth_Service(buildProfile());

            const decoded = jwt.verify(data.token, AUTH_VARS.JWT_SECRET);
            expect(decoded.user_id.toString()).toBe(data.user_id.toString());
            expect(decoded.username).toBe('John_Doe');
            expect(decoded.exp - decoded.iat).toBe(parseInt(AUTH_VARS.JWT_EXPIRATION_MS) / 1000);
        });

        it('replaces the whitespaces of the displayName with underscores', async () => {
            const { data } = await googleOAuth_Service(buildProfile({ displayName: 'Mary  Jane Watson' }));

            expect(data.username).toBe('Mary_Jane_Watson');
        });

        it('uses the email name as username when there is no displayName', async () => {
            const { data } = await googleOAuth_Service(buildProfile({ displayName: undefined }));

            expect(data.username).toBe('john.doe');
        });

        it('uses user_<googleId> as username when there is no displayName nor email, and saves a null email', async () => {
            const { error, data } = await googleOAuth_Service(buildProfile({ displayName: undefined, emails: undefined }));

            expect(error).toBeNull();
            expect(data.username).toBe('user_1234567890');
            const user = await UserModel.findOne({ provider_id: 'google_1234567890' });
            expect(user.email).toBeNull();
        });

        it('saves a null email when the emails list is empty', async () => {
            await googleOAuth_Service(buildProfile({ emails: [] }));

            const user = await UserModel.findOne({ provider_id: 'google_1234567890' });
            expect(user.email).toBeNull();
        });

        it('appends the last 6 digits of the google id when the username is already taken', async () => {
            await UserModel.create({ username: 'John_Doe', provider_type: 'google', provider_id: 'google_other', email: null });

            const { error, data } = await googleOAuth_Service(buildProfile());

            expect(error).toBeNull();
            expect(data.username).toBe('John_Doe_567890');
            expect(await UserModel.countDocuments({})).toBe(2);
        });
    });

    describe('existing user', () => {
        it('logs in the same user without creating a duplicate', async () => {
            const first = await googleOAuth_Service(buildProfile());
            const second = await googleOAuth_Service(buildProfile());

            expect(second.error).toBeNull();
            expect(second.data.user_id.toString()).toBe(first.data.user_id.toString());
            expect(second.data.username).toBe(first.data.username);
            expect(await UserModel.countDocuments({})).toBe(1);
        });

        it('keeps the stored username even if the google displayName changed', async () => {
            await googleOAuth_Service(buildProfile());

            const { data } = await googleOAuth_Service(buildProfile({ displayName: 'Another Name' }));

            expect(data.username).toBe('John_Doe');
            const decoded = jwt.verify(data.token, AUTH_VARS.JWT_SECRET);
            expect(decoded.username).toBe('John_Doe');
        });

        it('treats different google ids as different users', async () => {
            const first = await googleOAuth_Service(buildProfile({ id: '1111111111' }));
            const second = await googleOAuth_Service(buildProfile({ id: '2222222222' }));

            expect(first.data.user_id.toString()).not.toBe(second.data.user_id.toString());
            expect(await UserModel.countDocuments({})).toBe(2);
        });
    });

    describe('errors', () => {
        it('returns a SERVER error and no data when the database fails', async () => {
            jest.spyOn(UserModel, 'findOne').mockRejectedValueOnce(new Error('db down'));

            const { error, data } = await googleOAuth_Service(buildProfile());

            expect(data).toBeNull();
            expect(error.code).toBe('SERVER');
            expect(error.status_code).toBe(500);
            expect(await UserModel.countDocuments({})).toBe(0);
        });

        it('returns a SERVER error when the user can not be saved', async () => {
            jest.spyOn(UserModel.prototype, 'save').mockRejectedValueOnce(new Error('save failed'));

            const { error, data } = await googleOAuth_Service(buildProfile());

            expect(data).toBeNull();
            expect(error.code).toBe('SERVER');
        });

        it('returns a SERVER error when the profile is invalid', async () => {
            const { error, data } = await googleOAuth_Service(undefined);

            expect(data).toBeNull();
            expect(error.code).toBe('SERVER');
        });
    });
});
