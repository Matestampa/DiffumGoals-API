
const {validate_getGoals} = require('../../src/api/getGoals/validator.js');

const { DFLT_LIMITDATE_ORDER } = require('../../src/api/getGoals/const_vars.js');

describe('validate_getGoals', () => {
    it('should return valid data for correct input', () => {
        const query = { page: 2, limitDate_order: 1 };
        const result = validate_getGoals(query);
        expect(result.error).toBeNull();
        expect(result.queryData).toEqual({ page: 2, limitDate_order: 1 });
    });

    it('should return default values for missing input', () => {
        const query = {};
        const result = validate_getGoals(query);
        expect(result.error).toBeNull();
        expect(result.queryData).toEqual({ page: 1, limitDate_order: DFLT_LIMITDATE_ORDER });
    });

    it('should return error for invalid page', () => {
        const query = { page: -1, limitDate_order: 1 };
        const result = validate_getGoals(query);
        expect(result.error).not.toBeNull();
        expect(result.queryData).toBeNull();
    });

    it('should return error for invalid limitDate_order', () => {
        const query = { page: 1, limitDate_order: 0 };
        const result = validate_getGoals(query);
        console.log(result.error);
        expect(result.error).not.toBeNull();
        expect(result.queryData).toBeNull();
    });
});
