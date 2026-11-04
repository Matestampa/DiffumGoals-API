const request = require('supertest');
const jwt = require('jsonwebtoken');

const { App } = require('../../src/app.js');
const { AUTH_VARS, GOOGLE_OAUTH_VARS } = require('../../src/config/app_config.js');
const { DEFLT_API_ERRORS } = require('../../src/error_handling');
const { googleOAuth_Service } = require('../../src/api/users/service/usersService.js');

const { newObjectId, buildAuthCookie } = require('../test_utils.js');

jest.mock('../../src/logs/loggers.js', () => ({
    infoLogger: { info: jest.fn() },
    errorLogger: { error: jest.fn() }
}));

// The service is mocked: these tests only check the routes, redirections, cookies and that the service gets the google profile
jest.mock('../../src/api/users/service/usersService.js', () => ({
    googleOAuth_Service: jest.fn(),
    register_Service: jest.fn(),
    login_Service: jest.fn()
}));

const mockGoogleProfile = {
    id: '1234567890',
    displayName: 'John Doe',
    emails: [{ value: 'john.doe@example.com' }]
};

// Real strategy, except that the callback step (the one that talks to Google) is simulated:
//  - /callback?code=...   -> Google "returns" mockGoogleProfile, and the real verify function of passport_config runs
//  - /callback?error=...  -> the user denied the access in Google
// The first step (/auth/google) is the real one: it only builds the redirect url to Google, no network involved.
jest.mock('passport-google-oauth20', () => {
    const { Strategy: RealStrategy } = jest.requireActual('passport-google-oauth20');

    class MockGoogleStrategy extends RealStrategy {
        authenticate(req, options) {
            if (req.query.error) return this.fail({ message: req.query.error }, 401);
            if (!req.query.code) return super.authenticate(req, options);

            this._verify('google-access-token', 'google-refresh-token', mockGoogleProfile, (err, user, info) => {
                if (err) return this.error(err);
                if (!user) return this.fail(info);
                this.success(user, info);
            });
        }
    }

    return { Strategy: MockGoogleStrategy };
});

const GOOGLE_LOGIN_ENDPOINT = '/users/auth/google';
const GOOGLE_CALLBACK_ENDPOINT = '/users/auth/google/callback';
const LOGOUT_ENDPOINT = '/users/logout';
const IS_LOGGED_IN_ENDPOINT = '/users/isLoggedIn';

const OAUTH_FAILED_URL = `${GOOGLE_OAUTH_VARS.FRONTEND_URL}?error=oauth_failed`;

const signToken = (payload, secret = AUTH_VARS.JWT_SECRET, options = {}) => jwt.sign(payload, secret, options);

const authCookieHeader = token => [`${AUTH_VARS.JWT_COOKIE_NAME}=${token}`];

// Finds the "Set-Cookie" entry of the auth cookie in a response
const findAuthSetCookie = response =>
    (response.headers['set-cookie'] || []).find(c => c.startsWith(`${AUTH_VARS.JWT_COOKIE_NAME}=`));

beforeEach(() => jest.clearAllMocks());

describe('GET /users/auth/google', () => {

    it('redirects to the Google consent screen with the app credentials, scopes and callback url', async () => {
        const response = await request(App).get(GOOGLE_LOGIN_ENDPOINT);

        expect(response.status).toBe(302);
        const location = new URL(response.headers.location);
        expect(location.origin + location.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
        expect(location.searchParams.get('response_type')).toBe('code');
        expect(location.searchParams.get('client_id')).toBe(GOOGLE_OAUTH_VARS.CLIENT_ID);
        expect(location.searchParams.get('redirect_uri')).toBe(GOOGLE_OAUTH_VARS.CALLBACK_URL);
        expect(location.searchParams.get('scope').split(' ')).toEqual(expect.arrayContaining(['profile', 'email']));
    });

    it('does not call the service nor set a cookie', async () => {
        const response = await request(App).get(GOOGLE_LOGIN_ENDPOINT);

        expect(googleOAuth_Service).not.toHaveBeenCalled();
        expect(findAuthSetCookie(response)).toBeUndefined();
    });
});

describe('GET /users/auth/google/callback', () => {

    describe('when Google authenticates the user and the service succeeds', () => {
        const user_id = newObjectId().toString();
        const username = 'John_Doe';
        let token;

        beforeEach(() => {
            token = signToken({ user_id, username }, AUTH_VARS.JWT_SECRET, { expiresIn: 300 });
            googleOAuth_Service.mockResolvedValue({ error: null, data: { user_id, username, token } });
        });

        it('calls the service once with the google profile', async () => {
            await request(App).get(`${GOOGLE_CALLBACK_ENDPOINT}?code=google-code`);

            expect(googleOAuth_Service).toHaveBeenCalledTimes(1);
            expect(googleOAuth_Service).toHaveBeenCalledWith(mockGoogleProfile);
        });

        it('redirects to the frontend without error', async () => {
            const response = await request(App).get(`${GOOGLE_CALLBACK_ENDPOINT}?code=google-code`);

            expect(response.status).toBe(302);
            expect(response.headers.location).toBe(GOOGLE_OAUTH_VARS.FRONTEND_URL);
        });

        it('sets the JWT in an httpOnly, cross-site cookie that lasts JWT_EXPIRATION_MS', async () => {
            const response = await request(App).get(`${GOOGLE_CALLBACK_ENDPOINT}?code=google-code`);

            const cookie = findAuthSetCookie(response);
            expect(cookie).toBeDefined();
            expect(cookie.startsWith(`${AUTH_VARS.JWT_COOKIE_NAME}=${token};`)).toBe(true);
            expect(cookie).toContain('HttpOnly');
            expect(cookie).toContain('SameSite=None');
            expect(cookie).toContain(`Max-Age=${parseInt(AUTH_VARS.JWT_EXPIRATION_MS) / 1000}`);
        });

        it('leaves the user logged in: the cookie it sets is accepted by an authenticated endpoint', async () => {
            const callbackResponse = await request(App).get(`${GOOGLE_CALLBACK_ENDPOINT}?code=google-code`);
            const cookie = findAuthSetCookie(callbackResponse).split(';')[0];

            const response = await request(App).get(IS_LOGGED_IN_ENDPOINT).set('Cookie', [cookie]);

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual({ user_id, username });
        });
    });

    describe('when the service fails', () => {
        beforeEach(() => {
            googleOAuth_Service.mockResolvedValue({ error: DEFLT_API_ERRORS.SERVER(), data: null });
        });

        it('redirects to the frontend with the oauth_failed error and does not set a cookie', async () => {
            const response = await request(App).get(`${GOOGLE_CALLBACK_ENDPOINT}?code=google-code`);

            expect(googleOAuth_Service).toHaveBeenCalledTimes(1);
            expect(response.status).toBe(302);
            expect(response.headers.location).toBe(OAUTH_FAILED_URL);
            expect(findAuthSetCookie(response)).toBeUndefined();
        });
    });

    describe('when the user denies the access in Google', () => {
        it('redirects to the frontend with the oauth_failed error without calling the service nor setting a cookie', async () => {
            const response = await request(App).get(`${GOOGLE_CALLBACK_ENDPOINT}?error=access_denied`);

            expect(googleOAuth_Service).not.toHaveBeenCalled();
            expect(response.status).toBe(302);
            expect(response.headers.location).toBe(OAUTH_FAILED_URL);
            expect(findAuthSetCookie(response)).toBeUndefined();
        });
    });
});

describe('POST /users/logout', () => {

    it('responds 200 and clears the auth cookie', async () => {
        const response = await request(App)
            .post(LOGOUT_ENDPOINT)
            .set('Cookie', buildAuthCookie(newObjectId()));

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User logged out successfully');

        const cookie = findAuthSetCookie(response);
        expect(cookie).toBeDefined();
        expect(cookie.startsWith(`${AUTH_VARS.JWT_COOKIE_NAME}=;`)).toBe(true);
        expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('SameSite=None');
    });

    it('responds 401 NOT_AUTH when the user is not logged in', async () => {
        const response = await request(App).post(LOGOUT_ENDPOINT);

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('NOT_AUTH');
        expect(findAuthSetCookie(response)).toBeUndefined();
    });
});

// The authentication middleware is exercised through GET /users/isLoggedIn, which only returns what the middleware decoded
describe('authentication middleware', () => {

    it('lets the request through and exposes the user_id and username of a valid token', async () => {
        const user_id = newObjectId().toString();

        const response = await request(App)
            .get(IS_LOGGED_IN_ENDPOINT)
            .set('Cookie', buildAuthCookie(user_id, 'john'));

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User is logged in');
        expect(response.body.data).toEqual({ user_id, username: 'john' });
    });

    it('responds 401 NOT_AUTH when there is no cookie', async () => {
        const response = await request(App).get(IS_LOGGED_IN_ENDPOINT);

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('NOT_AUTH');
    });

    it('responds 401 NOT_AUTH when the token is in a cookie with another name', async () => {
        const token = signToken({ user_id: newObjectId().toString(), username: 'john' });

        const response = await request(App)
            .get(IS_LOGGED_IN_ENDPOINT)
            .set('Cookie', [`not_${AUTH_VARS.JWT_COOKIE_NAME}=${token}`]);

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('NOT_AUTH');
    });

    it('responds 401 NOT_AUTH when the token is not a JWT', async () => {
        const response = await request(App)
            .get(IS_LOGGED_IN_ENDPOINT)
            .set('Cookie', authCookieHeader('not-a-jwt'));

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('NOT_AUTH');
    });

    it('responds 401 NOT_AUTH when the token is signed with another secret', async () => {
        const token = signToken({ user_id: newObjectId().toString(), username: 'john' }, 'another-secret');

        const response = await request(App)
            .get(IS_LOGGED_IN_ENDPOINT)
            .set('Cookie', authCookieHeader(token));

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('NOT_AUTH');
    });

    it('responds 401 NOT_AUTH when the token is expired', async () => {
        const token = signToken({ user_id: newObjectId().toString(), username: 'john' }, AUTH_VARS.JWT_SECRET, { expiresIn: -10 });

        const response = await request(App)
            .get(IS_LOGGED_IN_ENDPOINT)
            .set('Cookie', authCookieHeader(token));

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('NOT_AUTH');
    });

    it('responds 401 NOT_AUTH when the token has a tampered payload', async () => {
        const [header, , signature] = buildAuthCookie(newObjectId())[0].split('=')[1].split('.');
        const forgedPayload = Buffer.from(JSON.stringify({ user_id: newObjectId().toString(), username: 'hacker' })).toString('base64url');

        const response = await request(App)
            .get(IS_LOGGED_IN_ENDPOINT)
            .set('Cookie', authCookieHeader(`${header}.${forgedPayload}.${signature}`));

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('NOT_AUTH');
    });

    it('responds 401 NOT_AUTH when the token is unsigned (alg none)', async () => {
        const token = signToken({ user_id: newObjectId().toString(), username: 'john' }, '', { algorithm: 'none' });

        const response = await request(App)
            .get(IS_LOGGED_IN_ENDPOINT)
            .set('Cookie', authCookieHeader(token));

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('NOT_AUTH');
    });
});
