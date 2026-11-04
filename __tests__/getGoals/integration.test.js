const request = require('supertest');

const { App } = require('../../src/app.js');
const { AUTH_VARS } = require('../../src/config/app_config.js');
const { PAGE_LIMIT, GOALS_STATUS } = require('../../src/api/getGoals/const_vars.js');

const {
    connectTestDb, disconnectTestDb, clearGoals, newObjectId, buildAuthCookie,
    buildGoal, buildCompletedGoal, buildExpiredGoal, seedGoals, seedDiffumingGoals
} = require('../test_utils.js');

const ALL_GOALS_ENDPOINT = '/goals/all';
const MY_GOALS_ENDPOINT = '/goals/myGoals';

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearGoals);

describe('GET /goals/all', () => {

    it('returns the goal with the expected structure and signed image urls', async () => {
        await seedGoals([buildGoal({ descr: 'my goal', s3_imgName_original: 'orig.png', s3_imgName_latest: 'latest.png' })]);

        const response = await request(App).get(ALL_GOALS_ENDPOINT);

        expect(response.status).toBe(200);
        expect(response.body.data.goals).toHaveLength(1);
        const goal = response.body.data.goals[0];
        expect(goal).toMatchObject({ descr: 'my goal', expired: false, completed: false });
        expect(goal).toHaveProperty('_id');
        expect(goal).toHaveProperty('limit_date');
        expect(goal.img_original).toEqual(expect.stringContaining('orig.png'));
        expect(goal.img_latest).toEqual(expect.stringContaining('latest.png'));
        expect(goal).not.toHaveProperty('img_completed');
        expect(goal).not.toHaveProperty('user_id');
        expect(goal).not.toHaveProperty('s3_imgName_original');
        expect(goal).not.toHaveProperty('s3_imgName_latest');
    });

    it('returns an empty list and a null nextPage when there are no goals', async () => {
        const response = await request(App).get(ALL_GOALS_ENDPOINT);

        expect(response.status).toBe(200);
        expect(response.body.data).toEqual({ goals: [], nextPage: null });
    });

    describe('goalStatus', () => {
        beforeEach(async () => {
            await seedGoals([
                buildGoal({ descr: 'diffuming' }),
                buildExpiredGoal({ descr: 'expired' }),
                buildCompletedGoal({ descr: 'completed' })
            ]);
        });

        it('defaults to the DIFFUMING goals', async () => {
            const response = await request(App).get(ALL_GOALS_ENDPOINT);

            expect(response.status).toBe(200);
            expect(response.body.data.goals.map(g => g.descr)).toEqual(['diffuming']);
        });

        it.each([
            [GOALS_STATUS.DIFFUMING, 'diffuming'],
            [GOALS_STATUS.EXPIRED, 'expired'],
            [GOALS_STATUS.COMPLETED, 'completed']
        ])('returns only the %s goals', async (goalStatus, expectedDescr) => {
            const response = await request(App).get(ALL_GOALS_ENDPOINT).query({ goalStatus });

            expect(response.status).toBe(200);
            expect(response.body.data.goals.map(g => g.descr)).toEqual([expectedDescr]);
        });

        it('includes img_completed only for completed goals', async () => {
            const response = await request(App).get(ALL_GOALS_ENDPOINT).query({ goalStatus: GOALS_STATUS.COMPLETED });

            expect(response.body.data.goals[0].img_completed).toEqual(expect.stringContaining('completed_'));
        });
    });

    describe('order', () => {
        beforeEach(async () => {
            await seedGoals([
                buildGoal({ descr: 'middle', limit_date: new Date('2030-02-01') }),
                buildGoal({ descr: 'last', limit_date: new Date('2030-03-01') }),
                buildGoal({ descr: 'first', limit_date: new Date('2030-01-01') })
            ]);
        });

        it('orders by limit_date ascending by default', async () => {
            const response = await request(App).get(ALL_GOALS_ENDPOINT);

            expect(response.body.data.goals.map(g => g.descr)).toEqual(['first', 'middle', 'last']);
        });

        it('orders by limit_date descending when order=-1', async () => {
            const response = await request(App).get(ALL_GOALS_ENDPOINT).query({ order: -1 });

            expect(response.body.data.goals.map(g => g.descr)).toEqual(['last', 'middle', 'first']);
        });
    });

    describe('pagination', () => {
        beforeEach(async () => {
            await seedDiffumingGoals(PAGE_LIMIT + 3);
        });

        it('returns a full first page with nextPage when there are more goals', async () => {
            const response = await request(App).get(ALL_GOALS_ENDPOINT).query({ page: 1 });

            expect(response.status).toBe(200);
            expect(response.body.data.goals).toHaveLength(PAGE_LIMIT);
            expect(response.body.data.nextPage).toBe(2);
        });

        it('returns the remaining goals with a null nextPage on the last page', async () => {
            const response = await request(App).get(ALL_GOALS_ENDPOINT).query({ page: 2 });

            expect(response.status).toBe(200);
            expect(response.body.data.goals).toHaveLength(3);
            expect(response.body.data.nextPage).toBeNull();
        });

        it('returns no goals for a page beyond the last one', async () => {
            const response = await request(App).get(ALL_GOALS_ENDPOINT).query({ page: 10 });

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual({ goals: [], nextPage: null });
        });
    });

    describe('invalid query params', () => {
        it.each([
            ['page=0', { page: 0 }],
            ['page=abc', { page: 'abc' }],
            ['an unknown goalStatus', { goalStatus: 'UNKNOWN' }],
            ['order=0', { order: 0 }]
        ])('responds with BAD_REQ for %s', async (_, query) => {
            const response = await request(App).get(ALL_GOALS_ENDPOINT).query(query);

            expect(response.status).toBe(404);
            expect(response.body.error.code).toBe('BAD_REQ');
        });
    });
});

describe('GET /goals/myGoals', () => {

    it('responds with NOT_AUTH when there is no auth cookie', async () => {
        const response = await request(App).get(MY_GOALS_ENDPOINT);

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('NOT_AUTH');
    });

    it('responds with NOT_AUTH when the token is invalid', async () => {
        const response = await request(App).get(MY_GOALS_ENDPOINT).set('Cookie', [`${AUTH_VARS.JWT_COOKIE_NAME}=not-a-token`]);

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('NOT_AUTH');
    });

    it('returns only the goals of the authenticated user, whatever their status', async () => {
        const userId = newObjectId();
        await seedGoals([
            buildGoal({ user_id: userId, descr: 'mine diffuming', limit_date: new Date('2030-01-01') }),
            buildExpiredGoal({ user_id: userId, descr: 'mine expired', limit_date: new Date('2030-02-01') }),
            buildCompletedGoal({ user_id: userId, descr: 'mine completed', limit_date: new Date('2030-03-01') }),
            buildGoal({ descr: 'someone else' })
        ]);

        const response = await request(App).get(MY_GOALS_ENDPOINT).set('Cookie', buildAuthCookie(userId));

        expect(response.status).toBe(200);
        expect(response.body.data.goals.map(g => g.descr)).toEqual(['mine diffuming', 'mine expired', 'mine completed']);
        expect(response.body.data.nextPage).toBeNull();
    });

    it('paginates the goals of the authenticated user', async () => {
        const userId = newObjectId();
        await seedDiffumingGoals(PAGE_LIMIT + 2, { user_id: userId });

        const firstPage = await request(App).get(MY_GOALS_ENDPOINT).query({ page: 1 }).set('Cookie', buildAuthCookie(userId));
        const secondPage = await request(App).get(MY_GOALS_ENDPOINT).query({ page: 2 }).set('Cookie', buildAuthCookie(userId));

        expect(firstPage.body.data.goals).toHaveLength(PAGE_LIMIT);
        expect(firstPage.body.data.nextPage).toBe(2);
        expect(secondPage.body.data.goals).toHaveLength(2);
        expect(secondPage.body.data.nextPage).toBeNull();
    });
});

