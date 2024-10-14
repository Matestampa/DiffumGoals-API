const { getGoals_Service } = require('../../src/api/getGoals/service/getGoalsService.js');
const { getGoals_errorHandler } = require('../../src/api/getGoals/service/error_handler.js');
const { getGoals_fromDB,applySignedUrls_4_goals } = require('../../src/api/getGoals/service/utils.js');
const { PAGE_LIMIT, DFLT_LIMITDATE_ORDER } = require('../../src/api/getGoals/const_vars.js');

const {GoalModel}=require("../../src/db/mongodb");

const {GEN_INT_ERRORS}=require("../../src/error_handling");


jest.mock('../../src/api/getGoals/service/error_handler.js');

//Hay q hacer esto para solo dejar algunas como mockeadas
jest.mock("../../src/api/getGoals/service/utils.js",()=>{
    const actualModule = jest.requireActual("../../src/api/getGoals/service/utils.js");
    return {
    ...actualModule,
    getGoals_fromDB: jest.fn(), //las devolvemos asi aca las q queremos mockear
                         //(deben tener el mismo nombre de lo q importamos)
    };
});

describe('getGoals_Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const serviceArgs={
        page:1,
        limitDate_order:DFLT_LIMITDATE_ORDER
    }

    it('should return goals and nextPage when there are goals', async () => {
        //Create {PAGE_LIMIT} number of mock goals
        const createMockGoals = (quantity) => {
            return Array.from({ length: quantity }, (_, i) => ({
            descr: `Goal ${i + 1}`,
            limit_date: '2023-12-31',
            s3_imgName: `img${i + 1}.jpg`
            }));
        };

        const mockGoals = createMockGoals(PAGE_LIMIT);
        const copiedMockGoals = JSON.parse(JSON.stringify(mockGoals));
        
        const signedGoals = applySignedUrls_4_goals(copiedMockGoals);
        
        getGoals_fromDB.mockResolvedValue(mockGoals);

        const result = await getGoals_Service(serviceArgs.page,serviceArgs.limitDate_order);

        expect(getGoals_fromDB).toHaveBeenCalledWith(serviceArgs.page,serviceArgs.limitDate_order);
        expect(result).toEqual({ error: null, data: { goals: signedGoals, nextPage: 2 } });
    });

    it('should return null nextPage when there are no more goals', async () => {
        const mockGoals = [
            { descr: 'Goal 1', limit_date: '2023-12-31', s3_imgName: 'img1.jpg' }
        ];
        const signedGoals = applySignedUrls_4_goals(mockGoals);
        
        getGoals_fromDB.mockResolvedValue(mockGoals);

        const result = await getGoals_Service(serviceArgs.page,serviceArgs.limitDate_order);

        expect(getGoals_fromDB).toHaveBeenCalledWith(serviceArgs.page,serviceArgs.limitDate_order);
        expect(result).toEqual({ error: null, data: { goals: signedGoals, nextPage: null } });
    });

    it('should handle errors and return error message', async () => {
        const mockError = GEN_INT_ERRORS.UNKNOWN(); //O UNO DE DB
        const mockUserError = 'User-friendly error message';
        
        getGoals_fromDB.mockRejectedValueOnce(mockError);
        
        getGoals_errorHandler.mockResolvedValueOnce(mockUserError);

        const result = await getGoals_Service(serviceArgs.page,serviceArgs.limitDate_order);

        expect(getGoals_fromDB).toHaveBeenCalledWith(serviceArgs.page,serviceArgs.limitDate_order);
        expect(getGoals_errorHandler).toHaveBeenCalledWith(mockError);
        expect(result).toEqual({ error: mockUserError, data: null });
    });
});
