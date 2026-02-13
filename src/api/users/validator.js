const Joi = require("joi");

const { DEFLT_API_ERRORS } = require("../../error_handling");

//###### CONST VARS FOR VALIDATION ########

// Password minimum length
const MIN_PASSWORD_LENGTH = 8;

//#########################################


//##### VALIDATION SCHEMA FOR LOGIN/REGISTER ########
const registerLogin_ValSchema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().min(MIN_PASSWORD_LENGTH).required().messages({
        "string.min": `"password" must be at least ${MIN_PASSWORD_LENGTH} characters long`
    })
});


//##### VALIDATION FUNCTION FOR LOGIN/REGISTER ########
function validate_register_login(reqBody) {
    let error;

    ({ error } = registerLogin_ValSchema.validate(reqBody));

    if (error) {
        return { error: DEFLT_API_ERRORS.BAD_REQ(error.message) };
    }

    return { error: undefined };
}


module.exports = { validate_register_login };
