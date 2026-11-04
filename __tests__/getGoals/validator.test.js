
const {validate_getGoals} = require('../../src/api/getGoals/validator.js');

const { DFLT_ORDER, DFLT_GOAL_STATUS, GOALS_STATUS } = require('../../src/api/getGoals/const_vars.js');

describe('validate_getGoals', () => {
    it('should return valid data for correct input', () => {
        const query = { page: 2, goalStatus: GOALS_STATUS.EXPIRED, order: -1 };
        const result = validate_getGoals(query);
        expect(result.error).toBeNull();
        expect(result.queryData).toEqual({ page: 2, goalStatus: GOALS_STATUS.EXPIRED, order: -1 });
    });

    it('should return default values for missing input', () => {
        const query = {};
        const result = validate_getGoals(query);
        expect(result.error).toBeNull();
        expect(result.queryData).toEqual({ page: 1, goalStatus: DFLT_GOAL_STATUS, order: DFLT_ORDER });
    });

    it('should return error for invalid page', () => {
        const query = { page: -1 };
        const result = validate_getGoals(query);
        expect(result.error).not.toBeNull();
        expect(result.queryData).toBeNull();
    });

    it('should return error for invalid goalStatus', () => {
        const query = { goalStatus: 'UNKNOWN' };
        const result = validate_getGoals(query);
        expect(result.error).not.toBeNull();
        expect(result.queryData).toBeNull();
    });

    it('should return error for invalid order', () => {
        const query = { order: 0 };
        const result = validate_getGoals(query);
        expect(result.error).not.toBeNull();
        expect(result.queryData).toBeNull();
    });
});

