const { newGoal_Service } = require('../../src/services/newGoal/newGoalService.js');
const { S3_FUNCS,AWS_GEN_ERRORS } = require('../../src/aws_services/index.js');
const {DEFLT_API_ERRORS}=require("../../src/error_handling/index.js");
//const { generateRand_MONGO_S3_ids } = require('../../src/services/newGoal/utils.js');
const { GoalModel } = require('../../src/db/mongodb/index.js');
const { MongoDB_Error } = require('../../src/db/mongodb/index.js');
const { newGoal_errorHandler } = require('../../src/services/newGoal/error_handler.js');


jest.mock('../../src/aws_services');
jest.mock('../../src/db/mongodb');
//jest.mock('../../src/services/newGoal/utils.js');

/*jest.mock('../../../src/services/newGoal/error_handler.js',() => ({
    newGoal_errorHandler: jest.fn().mockResolvedValue(DEFLT_API_ERRORS.SERVER()),
}));*/

jest.mock('../../src/services/newGoal/error_handler.js');


describe('newGoal_Service', () => {
    let mockImgBuffer = Buffer.from('mock image data');
    let mockUserId = 'user123';
    let mockDescr = 'A sample goal description';
    let mockLimitDate = new Date();
    
    beforeEach(() => {
        jest.clearAllMocks();  // Clear mocks before each test
    });

    it('should successfully save goal to S3 and MongoDB', async () => {
        // Mock generated IDs
        /*generateRand_MONGO_S3_ids.mockReturnValue({
            db_id: 'mockMongoId',
            s3_id: 'mockS3Id'
        });*/

        // Mock saveObject (S3)
        S3_FUNCS.saveObject.mockResolvedValueOnce(true);  // Simulate successful S3 upload

        // Mock GoalModel.save() (MongoDB)
        GoalModel.prototype.save.mockResolvedValueOnce(true);  // Simulate successful MongoDB save

        const result = await newGoal_Service(mockUserId, mockDescr, mockLimitDate, mockImgBuffer);
        
        // Expect no errors
        expect(result.error).toBeNull();
        expect(result.data).toHaveProperty('goal_id');
        expect(result.data).toHaveProperty('img_id');

        // Verify S3 and MongoDB were called
        expect(S3_FUNCS.saveObject).toHaveBeenCalled();
        expect(GoalModel.prototype.save).toHaveBeenCalled();
    });

    //hacer los tests que faltan
    it('should handle S3 error and return user-friendly error', async () => {
        // Mock generated IDs
        /*generateRand_MONGO_S3_ids.mockReturnValue({
            mongo_id: 'mockMongoId',
            s3_id: 'mockS3Id'
        });*/

        // Simulate S3 error
        const mockS3Error = new AWS_GEN_ERRORS.AwsService_Error();
        S3_FUNCS.saveObject.mockRejectedValueOnce(mockS3Error);

        // Mock error handler
        const mockErrorResponse = DEFLT_API_ERRORS.SERVER();
        newGoal_errorHandler.mockResolvedValueOnce(mockErrorResponse);

        const result = await newGoal_Service(mockUserId, mockDescr, mockLimitDate, mockImgBuffer);

        // Verify error was handled
        expect(newGoal_errorHandler).toHaveBeenCalled()
        expect(result.error).toEqual(mockErrorResponse);
        expect(result.data).toBeNull();

        // Ensure MongoDB wasn't called after S3 failure
        expect(GoalModel.prototype.save).not.toHaveBeenCalled();
    });

    it('should handle MongoDB error and return user-friendly error', async () => {
        // Mock generated IDs
        /*generateRand_MONGO_S3_ids.mockReturnValue({
            mongo_id: 'mockMongoId',
            s3_id: 'mockS3Id'
        });*/

        // Mock S3 upload success
        S3_FUNCS.saveObject.mockResolvedValueOnce(true);

        // Simulate MongoDB error
        const mockMongoError = new MongoDB_Error('MongoDB failed');
        GoalModel.prototype.save.mockRejectedValueOnce(mockMongoError);

        // Mock error handler
        const mockErrorResponse = DEFLT_API_ERRORS.SERVER();
        newGoal_errorHandler.mockResolvedValueOnce(mockErrorResponse);

        const result = await newGoal_Service(mockUserId, mockDescr, mockLimitDate, mockImgBuffer);

        // Verify error was handled
        expect(newGoal_errorHandler).toHaveBeenCalled()
        expect(result.error).toEqual(mockErrorResponse);
        expect(result.data).toBeNull();

        // Verify S3 was called before MongoDB failure
        expect(S3_FUNCS.saveObject).toHaveBeenCalled();
    });


})