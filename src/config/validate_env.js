const { get_required_env_vars } = require("./required_env_vars.js");

// Checks process.env already has every var required for APP_ENV; exits the
// process if any are missing. Must be called right after whatever populated
// process.env for that environment (dotenv for local, SSM for dev/prod).
function validate_env(APP_ENV){
    const required = get_required_env_vars(APP_ENV);
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0){
        console.error(`Missing required environment variable(s) for APP_ENV="${APP_ENV}": ${missing.join(", ")}`);
        process.exit(1);
    }
}

module.exports = { validate_env };
