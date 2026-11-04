const mongoose = require("mongoose");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { MONGODB_VARS } = require("../src/config/mongodb.js");
const { AUTH_VARS } = require("../src/config/app_config.js");
const { GoalModel, UserModel } = require("../src/db/mongodb");

// Each Jest worker gets its own database, so test files running in parallel never wipe each other's data
// (and the database configured in MONGODB_URL is never touched).
const TEST_DB_NAME = `diffum_test_${process.env.JEST_WORKER_ID || 1}`;

async function connectTestDb() {
    await mongoose.connect(MONGODB_VARS.url, { dbName: TEST_DB_NAME });
}

async function disconnectTestDb() {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
}

async function clearGoals() {
    await GoalModel.deleteMany({});
}

async function clearUsers() {
    await UserModel.deleteMany({});
}

const newObjectId = () => new mongoose.Types.ObjectId(crypto.randomBytes(12).toString("hex"));

// Builds a "Cookie" header value with a valid auth JWT, as set by the authentication middleware.
function buildAuthCookie(user_id, username = "tester") {
    const token = jwt.sign({ user_id: user_id.toString(), username }, AUTH_VARS.JWT_SECRET);
    return [`${AUTH_VARS.JWT_COOKIE_NAME}=${token}`];
}

let goalCounter = 0;

// Builds a valid goal document (diffuming by default). Any field can be overridden.
function buildGoal(overrides = {}) {
    goalCounter++;
    return {
        user_id: newObjectId(),
        username: `user${goalCounter}`,
        descr: `Goal ${goalCounter}`,
        limit_date: new Date("2030-01-01T00:00:00.000Z"),
        s3_imgName_original: `original_${goalCounter}.png`,
        s3_imgName_latest: `latest_${goalCounter}.png`,
        cant_pix_xday: 10,
        last_diffumDate: new Date("2029-01-01T00:00:00.000Z"),
        expired: false,
        completed: false,
        ...overrides
    };
}

// Builds a completed goal (completed + its completed image and date).
function buildCompletedGoal(overrides = {}) {
    return buildGoal({
        completed: true,
        completed_date: new Date("2029-06-01T00:00:00.000Z"),
        s3_imgName_completed: `completed_${goalCounter + 1}.png`,
        ...overrides
    });
}

function buildExpiredGoal(overrides = {}) {
    return buildGoal({ expired: true, ...overrides });
}

// Inserts the given goals (in order) and returns the saved documents.
async function seedGoals(goals) {
    return GoalModel.insertMany(goals);
}

// Inserts `quantity` diffuming goals with increasing limit_date (Goal 1 is the earliest).
async function seedDiffumingGoals(quantity, overrides = {}) {
    const goals = Array.from({ length: quantity }, (_, i) => buildGoal({
        descr: `Goal ${i + 1}`,
        limit_date: new Date(Date.UTC(2030, 0, i + 1)),
        ...overrides
    }));
    return seedGoals(goals);
}

module.exports = {
    connectTestDb,
    disconnectTestDb,
    clearGoals,
    clearUsers,
    newObjectId,
    buildAuthCookie,
    buildGoal,
    buildCompletedGoal,
    buildExpiredGoal,
    seedGoals,
    seedDiffumingGoals
};
