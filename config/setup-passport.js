var passport = require('passport');
var Auth0Strategy = require('passport-auth0');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var User = require('../app/models/users');

var strategy = new Auth0Strategy({
    domain: process.env.AUTH0_DOMAIN,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:9080/auth/callback'
}, function (accessToken, refreshToken, extraParams, profile, done) {
    // accessToken is the token to call Auth0 API (not needed in the most cases)
    // extraParams.id_token has the JSON Web Token
    // profile has all the information from the user
    return done(null, profile);
});


var googleStrategy = new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:9080/auth/google/callback"

},function(accessToken,refreshToken,profile,done) {
    var findQuery = {email:profile.emails[0].value};



    var insertQuery = {
        email: profile.emails[0].value,
        provider: "google",
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        profileImageUrl: profile.photos[0].value
    }
    User.findOrCreate(findQuery,insertQuery,function(err,user,created) {
        return done(err,user);
    })
});

passport.use(strategy);

passport.use(googleStrategy)


// This is not a best practice, but we want to keep things simple for now
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

module.exports = strategy;