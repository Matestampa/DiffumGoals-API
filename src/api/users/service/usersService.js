const {get_user,create_user,compare_passwords,generate_JWT} = require("./utils.js");

const {DEFLT_API_ERRORS} = require("../../../error_handling");
const {users_errorHandler} = require("./error_handler.js");


async function register_Service(username, password) {

    try {
        // Check if user already exists
        const existingUser = await get_user(username);
        if (existingUser) {
            return {error: DEFLT_API_ERRORS.BAD_REQ("Username already exists"),data:null};
        }
        else{
            // Create new user
            //Hashear password ============================================================
            const newUser = await create_user(username, password);
            return {error: null, data: {
                user_id: newUser._id,
                username: newUser.username
            }};
        }
    }
    catch (e) {
        let user_error = await users_errorHandler(e);
        return {error: user_error, data: null};
    }

}


async function login_Service(username, password) {
    
    try {
        let user = await get_user(username);
        
        if (!user) {
            return {error: DEFLT_API_ERRORS.BAD_REQ("Invalid username or password"), data: null};
        }

        // Check password
        const isPasswordValid = compare_passwords(password, user.password);
        if (!isPasswordValid) {
            return {error: DEFLT_API_ERRORS.BAD_REQ("Invalid username or password"), data: null};
        }

        return {error: null, data: {
            user_id: user._id,
            username: user.username,
            token: generate_JWT(user._id, user.username)
        }};

    }
    catch (e) {
        let user_error = await users_errorHandler(e);
        return {error: user_error, data: null};
    }
}


module.exports = {
    register_Service,
    login_Service
}