const {get_user,create_user,hash_password,compare_passwords,generate_JWT,get_user_by_provider_id,create_oauth_user} = require("./utils.js");

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
            
            let hasshedPassword = await hash_password(password);

            const newUser = await create_user(username, hasshedPassword);
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
        const isPasswordValid = await compare_passwords(password, user.password);
        
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

async function googleOAuth_Service(profile) {
    try {
        const provider_type = "google";
        const provider_id = `${provider_type}_${profile.id}`;
        const email = profile.emails?.[0]?.value ?? null;

        let user = await get_user_by_provider_id(provider_id);

        if (!user) {
            const baseName = profile.displayName
                ? profile.displayName.replace(/\s+/g, "_")
                : (email ? email.split("@")[0] : `user_${profile.id}`);

            let username = baseName;
            let existing = await get_user(username);
            if (existing) {
                username = `${baseName}_${profile.id.slice(-6)}`;
            }

            user = await create_oauth_user(username, provider_type, provider_id, email);
        }

        return {
            error: null,
            data: {
                user_id: user._id,
                username: user.username,
                token: generate_JWT(user._id, user.username)
            }
        };
    }
    catch (e) {
        let user_error = await users_errorHandler(e);
        return { error: user_error, data: null };
    }
}


module.exports = {
    register_Service,
    login_Service,
    googleOAuth_Service
}


