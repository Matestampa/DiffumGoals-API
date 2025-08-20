const {validate_newGoal}=require("../../src/api/newGoal/validator.js");
const {DFLT_IMG_SIZE}=require("../../src/api/newGoal/const_vars.js");
const {DEFLT_API_ERRORS}=require("../../src/error_handling");
const sharp = require('sharp');

describe('validate_newGoal', () => {
    let reqImgFile={buffer:undefined,mimetype:""};
    let reqBody;

    // Crear la imagen una vez antes de los tests
    beforeAll(async () => {
        let imgBuffer = await sharp({
            create: {
                width: DFLT_IMG_SIZE.width,
                height: DFLT_IMG_SIZE.height,
                channels: 3,
                background: { r: 255, g: 0, b: 0 },
            },
        }).png().toBuffer();

        reqImgFile={
            buffer:imgBuffer,
            mimetype:"image/png"
        }

        reqBody= {
            user_id: '123456789012345678901234',
            descr: 'A valid description',
            limit_date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), // 16 days from now
        };
    });

    it('should validate fields correctly with valid data', async () => {

        const result = await validate_newGoal(reqBody, reqImgFile);
        expect(result.error).toBeUndefined(); // Sin error significa que no debe haber retorno
    });

    it('should return an error for invalid user_id', async () => {
        const reqBody= {
            user_id: 'asdasd',
            descr: 'A valid description',
            limit_date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), // 16 days from now
        };
        const result = await validate_newGoal(reqBody, reqImgFile);
        expect(result.error).toBeDefined();
    });

    it('should return an error for invalid image size', async () => {
        const invalidImgBuffer = await sharp({
            create: {
                width: 50, // Incorrect width
                height: 50, // Incorrect height
                channels: 3,
                background: { r: 255, g: 0, b: 0 },
            },
        }).jpeg().toBuffer(); // Asegúrate de usar un formato compatible
        reqImgFile.buffer=invalidImgBuffer;

        const result = await validate_newGoal(reqBody, reqImgFile);
        expect(result.error).toBeDefined();
    });



})