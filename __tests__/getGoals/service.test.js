const { getGoals_Service, getMyGoals_Service } = require('../../src/api/getGoals/service/getGoalsService.js');
const { PAGE_LIMIT, GOALS_STATUS } = require('../../src/api/getGoals/const_vars.js');

const {
    connectTestDb, disconnectTestDb, clearGoals, newObjectId,
    buildGoal, buildCompletedGoal, buildExpiredGoal, seedGoals, seedDiffumingGoals
} = require('../test_utils.js');

// Only the logging side effect of the error handler is silenced, the DB and the error handler are real
jest.mock('../../src/logs/loggers.js', () => ({
    infoLogger: { info: jest.fn() },
    errorLogger: { error: jest.fn() }
}));

const ASC = 1;
const DESC = -1;

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearGoals);

describe('getGoals_Service', () => {

    describe('filtering by goalStatus', () => {
        beforeEach(async () => {
            await seedGoals([
                buildGoal({ descr: 'diffuming 1' }),
                buildGoal({ descr: 'diffuming 2' }),
                buildExpiredGoal({ descr: 'expired 1' }),
                buildCompletedGoal({ descr: 'completed 1' })
            ]);
        });

        it('DIFFUMING returns only goals that are neither expired nor completed', async () => {
            const { error, data } = await getGoals_Service(1, GOALS_STATUS.DIFFUMING, ASC);

            expect(error).toBeNull();
            expect(data.goals.map(g => g.descr).sort()).toEqual(['diffuming 1', 'diffuming 2']);
        });

        it('EXPIRED returns only expired goals', async () => {
            const { error, data } = await getGoals_Service(1, GOALS_STATUS.EXPIRED, ASC);

            expect(error).toBeNull();
            expect(data.goals.map(g => g.descr)).toEqual(['expired 1']);
        });

        it('COMPLETED returns only completed goals', async () => {
            const { error, data } = await getGoals_Service(1, GOALS_STATUS.COMPLETED, ASC);

            expect(error).toBeNull();
            expect(data.goals.map(g => g.descr)).toEqual(['completed 1']);
        });
    });

    describe('goals shape', () => {
        it('replaces the s3 image names with signed urls for a not completed goal', async () => {
            await seedGoals([buildGoal({
                s3_imgName_original: 'my_original.png',
                s3_imgName_latest: 'my_latest.png'
            })]);

            const { data } = await getGoals_Service(1, GOALS_STATUS.DIFFUMING, ASC);
            const [goal] = data.goals;

            expect(goal.img_original).toEqual(expect.stringContaining('my_original.png'));
            expect(goal.img_original).toEqual(expect.stringContaining('Signature='));
            expect(goal.img_latest).toEqual(expect.stringContaining('my_latest.png'));
            expect(goal.img_latest).toEqual(expect.stringContaining('Signature='));
            expect(goal).not.toHaveProperty('img_completed');
            expect(goal).not.toHaveProperty('s3_imgName_original');
            expect(goal).not.toHaveProperty('s3_imgName_latest');
            expect(goal).not.toHaveProperty('s3_imgName_completed');
        });

        it('also returns the completed signed url for a completed goal', async () => {
            await seedGoals([buildCompletedGoal({ s3_imgName_completed: 'my_completed.png' })]);

            const { data } = await getGoals_Service(1, GOALS_STATUS.COMPLETED, ASC);
            const [goal] = data.goals;

            expect(goal.completed).toBe(true);
            expect(goal.completed_date).toBeInstanceOf(Date);
            expect(goal.img_completed).toEqual(expect.stringContaining('my_completed.png'));
            expect(goal).not.toHaveProperty('s3_imgName_completed');
        });

        it('only exposes the selected fields', async () => {
            await seedGoals([buildGoal()]);

            const { data } = await getGoals_Service(1, GOALS_STATUS.DIFFUMING, ASC);
            const [goal] = data.goals;

            expect(Object.keys(goal).sort()).toEqual(
                ['_id', 'completed', 'completed_date', 'descr', 'expired', 'img_latest', 'img_original', 'limit_date'].sort()
            );
        });
    });

    describe('ordering', () => {
        beforeEach(async () => {
            await seedGoals([
                buildGoal({ descr: 'middle', limit_date: new Date('2030-02-01') }),
                buildGoal({ descr: 'last', limit_date: new Date('2030-03-01') }),
                buildGoal({ descr: 'first', limit_date: new Date('2030-01-01') })
            ]);
        });

        it('orders DIFFUMING goals by limit_date ascending', async () => {
            const { data } = await getGoals_Service(1, GOALS_STATUS.DIFFUMING, ASC);

            expect(data.goals.map(g => g.descr)).toEqual(['first', 'middle', 'last']);
        });

        it('orders DIFFUMING goals by limit_date descending', async () => {
            const { data } = await getGoals_Service(1, GOALS_STATUS.DIFFUMING, DESC);

            expect(data.goals.map(g => g.descr)).toEqual(['last', 'middle', 'first']);
        });

        it('orders COMPLETED goals by completed_date, not by limit_date', async () => {
            await clearGoals();
            await seedGoals([
                buildCompletedGoal({ descr: 'completed second', limit_date: new Date('2030-01-01'), completed_date: new Date('2029-02-01') }),
                buildCompletedGoal({ descr: 'completed first', limit_date: new Date('2030-12-01'), completed_date: new Date('2029-01-01') })
            ]);

            const { data } = await getGoals_Service(1, GOALS_STATUS.COMPLETED, ASC);

            expect(data.goals.map(g => g.descr)).toEqual(['completed first', 'completed second']);
        });
    });

    describe('pagination', () => {
        beforeEach(async () => {
            await seedDiffumingGoals(PAGE_LIMIT + 3);
        });

        it('returns a full first page and the next page number', async () => {
            const { error, data } = await getGoals_Service(1, GOALS_STATUS.DIFFUMING, ASC);

            expect(error).toBeNull();
            expect(data.goals).toHaveLength(PAGE_LIMIT);
            expect(data.goals[0].descr).toBe('Goal 1');
            expect(data.nextPage).toBe(2);
        });

        it('returns the remaining goals and a null nextPage on the last page', async () => {
            const { error, data } = await getGoals_Service(2, GOALS_STATUS.DIFFUMING, ASC);

            expect(error).toBeNull();
            expect(data.goals).toHaveLength(3);
            expect(data.goals[0].descr).toBe(`Goal ${PAGE_LIMIT + 1}`);
            expect(data.nextPage).toBeNull();
        });

        it('returns no goals and a null nextPage for a page beyond the last one', async () => {
            const { error, data } = await getGoals_Service(5, GOALS_STATUS.DIFFUMING, ASC);

            expect(error).toBeNull();
            expect(data).toEqual({ goals: [], nextPage: null });
        });
    });

    it('returns no goals when the DB is empty', async () => {
        const { error, data } = await getGoals_Service(1, GOALS_STATUS.DIFFUMING, ASC);

        expect(error).toBeNull();
        expect(data).toEqual({ goals: [], nextPage: null });
    });

    it('returns a server error when the DB query fails', async () => {
        // A negative page makes the DB reject the query (negative skip)
        const { error, data } = await getGoals_Service(-1, GOALS_STATUS.DIFFUMING, ASC);

        expect(data).toBeNull();
        expect(error).toMatchObject({ code: 'SERVER', status_code: 500 });
    });
});

describe('getMyGoals_Service', () => {
    const userId = newObjectId();

    it('returns only the goals of the user, whatever their status', async () => {
        await seedGoals([
            buildGoal({ user_id: userId, descr: 'mine diffuming', limit_date: new Date('2030-01-01') }),
            buildExpiredGoal({ user_id: userId, descr: 'mine expired', limit_date: new Date('2030-02-01') }),
            buildCompletedGoal({ user_id: userId, descr: 'mine completed', limit_date: new Date('2030-03-01') }),
            buildGoal({ descr: 'someone else' })
        ]);

        const { error, data } = await getMyGoals_Service(userId, 1);

        expect(error).toBeNull();
        expect(data.goals.map(g => g.descr)).toEqual(['mine diffuming', 'mine expired', 'mine completed']);
        expect(data.nextPage).toBeNull();
    });

    it('adds the signed urls, adding img_completed only for the completed goals', async () => {
        await seedGoals([
            buildGoal({ user_id: userId, limit_date: new Date('2030-01-01') }),
            buildCompletedGoal({ user_id: userId, limit_date: new Date('2030-02-01') })
        ]);

        const { data } = await getMyGoals_Service(userId, 1);
        const [notCompleted, completed] = data.goals;

        expect(notCompleted.img_latest).toEqual(expect.stringContaining('Signature='));
        expect(notCompleted.img_original).toEqual(expect.stringContaining('Signature='));
        expect(notCompleted).not.toHaveProperty('img_completed');
        expect(completed.img_completed).toEqual(expect.stringContaining('Signature='));
    });

    it('paginates the goals of the user', async () => {
        await seedDiffumingGoals(PAGE_LIMIT + 2, { user_id: userId });

        const firstPage = await getMyGoals_Service(userId, 1);
        const secondPage = await getMyGoals_Service(userId, 2);

        expect(firstPage.data.goals).toHaveLength(PAGE_LIMIT);
        expect(firstPage.data.nextPage).toBe(2);
        expect(secondPage.data.goals).toHaveLength(2);
        expect(secondPage.data.nextPage).toBeNull();
    });

    it('returns no goals for a user without goals', async () => {
        await seedGoals([buildGoal({ descr: 'someone else' })]);

        const { error, data } = await getMyGoals_Service(userId, 1);

        expect(error).toBeNull();
        expect(data).toEqual({ goals: [], nextPage: null });
    });
});
