const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
require("dotenv").config();



passport.use(new GoogleStrategy(
    {
        clientID: process.env.Client_id,
        clientSecret: process.env.Client_secret,
        callbackURL: process.env.callbackURL,
        passReqToCallback: true,
    },
    function (request, accessToken, refreshToken, profile, done) {
        return done(null, profile);
    }
));

passport.serializeUser((user, done) => {
    console.log(user,"user Data")
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});