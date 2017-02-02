var passport = require('passport');
var LocalStrategy = require('passport-local');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var User = require('../app/models/users');

var localStrategy = new LocalStrategy({
    usernameField: "email",
    passwordField: "password"
}, function (email, password, done) {
    User.findOne({email: email, provider: 'local'})
        .populate('_team')
        .exec(function (err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false, {message: "user not found"});
            }
            if (!user.activated) {
                var link = '/api/user/' + user._id + '/resend?emailType=activation';
                return done(null, false, {message: "activation pending", link: link});
            }
            if (!user.validPassword(password)) {
                return done(null, false, {message: "wrong password"});
            }
            if (!user.active) {
                return done(null, false, {message: "You are banned"});
            }
            if (!user.defaultLoginTeam || user._team.length == 0) {
                return done(null,false,{message: "no team set up",userId:user._id});
            }
            return done(null, user);
        })
})


var baseURL = process.env.USE_SSL === 'true' ? 'https://app.' : 'http://app.';
baseURL += process.env.HOST ? process.env.HOST : 'localhost:9080';

var googleStrategy = new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: baseURL + "/auth/google/callback"

}, function (accessToken, refreshToken, profile, done) {
    var findQuery = {email: profile.emails[0].value};
    var insertQuery = {
        email: profile.emails[0].value,
        provider: "google",
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        profileImageUrl: profile.photos[0].value
    };
    User.findOrCreate(findQuery, insertQuery, function (err, user, created) {
        if (!created && user && !user.active) return done(err, false, {message: "You are banned"});
        return done(err, user);
    })
});

passport.use(localStrategy);

passport.use(googleStrategy);


// This is not a best practice, but we want to keep things simple for now
passport.serializeUser(function (user, done) {
    done(null, user._id);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});



