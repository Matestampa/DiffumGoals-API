const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");

const { GOOGLE_OAUTH_VARS } = require("./app_config.js");
const { googleOAuth_Service } = require("../api/users/service/usersService.js");

passport.use(
    new GoogleStrategy(
        {
            clientID: GOOGLE_OAUTH_VARS.CLIENT_ID,
            clientSecret: GOOGLE_OAUTH_VARS.CLIENT_SECRET,
            callbackURL: GOOGLE_OAUTH_VARS.CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            
            const { error, data } = await googleOAuth_Service(profile);
            if (error) return done(error, null);
            return done(null, data);
        }
    )
);

module.exports = passport;
