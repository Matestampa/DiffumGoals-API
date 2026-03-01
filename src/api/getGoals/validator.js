const Joi = require("joi");

const {DEFLT_API_ERRORS}=require("../../error_handling");

const {DFLT_ORDER, DFLT_GOAL_STATUS, VALID_GOAL_STATUSES}=require("./const_vars.js");

const getGoals_ValSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    goalStatus: Joi.string().valid(...VALID_GOAL_STATUSES).default(DFLT_GOAL_STATUS),
    order: Joi.number().valid(1, -1).default(DFLT_ORDER)
});

const getGoal_originalImage_ValSchema = Joi.object({
    id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
});


function validate_getGoals(query) {
    const { error, value } = getGoals_ValSchema.validate(query);

    if (error) {
        return { error: DEFLT_API_ERRORS.BAD_REQ(error.message), queryData:null };
    }

    return {error: null,
            queryData:{
               page: value.page,
               goalStatus: value.goalStatus,
               order: value.order
            }
        };
}

function validate_getGoal_originalImage(params) {
    const { error, value } = getGoal_originalImage_ValSchema.validate(params);

    if (error) {
        return { error: DEFLT_API_ERRORS.BAD_REQ(error.message), paramData: null };
    }

    return {
        error: null,
        paramData: {
            id: value.id
        }
    };
}

module.exports = { validate_getGoals, validate_getGoal_originalImage };