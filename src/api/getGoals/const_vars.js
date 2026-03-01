
const PAGE_LIMIT = 10; //Number of goals per page

const SGNDURL_LIMITDATE_MS = 1000 * 60 * 60; //1 hour in milliseconds for signed URL expiration

const DFLT_ORDER = 1; //Default order direction (1 = ascending, -1 = descending)

// ============ GOAL STATUS CONFIGURATIONS ============
// Each status defines: filter (MongoDB query) and orderField (field to sort by)

const GOALS_STATUS = {
    DIFFUMING: 'diffuming',
    EXPIRED: 'expired',
    COMPLETED: 'completed'
};

const GOALS_STATUS_CONFIG = {
    DIFFUMING: {
        filter: { expired: false, completed: false },
        orderField: 'limit_date'
    },
    EXPIRED: {
        filter: { expired: true },
        orderField: 'limit_date'
    },
    COMPLETED: {
        filter: { completed: true },
        orderField: 'completed_date'
    }
};

const DFLT_GOAL_STATUS = GOALS_STATUS.DIFFUMING;

// Valid status values for validation
const VALID_GOAL_STATUSES = Object.values(GOALS_STATUS);

module.exports = {
    PAGE_LIMIT,
    SGNDURL_LIMITDATE_MS,
    DFLT_ORDER,
    GOALS_STATUS,
    GOALS_STATUS_CONFIG,
    DFLT_GOAL_STATUS,
    VALID_GOAL_STATUSES
};