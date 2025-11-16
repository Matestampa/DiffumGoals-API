const Joi = require("joi");

const {DEFLT_API_ERRORS}=require("../../error_handling");

const {DFLT_LIMITDATE_ORDER}=require("./const_vars.js");

const getGoals_ValSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limitDate_order: Joi.number().valid(1, -1).default(DFLT_LIMITDATE_ORDER)
});


function validate_getGoals(query) {
    const { error, value } = getGoals_ValSchema.validate(query);

    if (error) {
        return { error: DEFLT_API_ERRORS.BAD_REQ(error.message), queryData:null };
    }

    return {error: null,
            queryData:{
               page:value.page,
               limitDate_order:value.limitDate_order}
            };
}

module.exports = { validate_getGoals };