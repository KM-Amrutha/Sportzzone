const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
require("dotenv").config();

passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(new GoogleStrategy(
    {
        clientID: process.env.Client_id,
        clientSecret: process.env.Client_secret,
        callbackURL: `http://localhost:${process.env.PORT}/auth/google/callback`,
        passReqToCallback: true,
    },
    function (request, accessToken, refreshToken, profile, done) {
        return done(null, profile);
    }
));