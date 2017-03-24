var passport = require('passport');
var LocalStrategy = require('passport-local');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var User = require('../app/models/users');

var localStrategy = new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, function (email, password, done) {
    User.findOne({email: email, provider: 'local'})
        .populate('_team')
        .exec(function (err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false, {message: 'User account not found.'});
            }
            if (!user.activated) {
                var link = '/api/user/' + user._id + '/resend?emailType=activation';
                return done(null, false, {message: 'Activation pending.', link: link});
            }
            if (!user.validPassword(password)) {
                return done(null, false, {message: 'Incorrect password.'});
            }
            if (!user.active) {
                return done(null, false, {message: 'This account is not active.'});
            }
            if (!user.defaultLoginTeam || user._team.length == 0) {
                return done(null,false,{message: 'User is not associated with a team.',userId:user._id});
            }
            return done(null, user);
        });
});

passport.use(localStrategy);



var baseURL = process.env.USE_SSL === 'true' ? 'https://' : 'http://'
baseURL += process.env.NODE_ENV == 'enterprise' ? '' : 'app.'
baseURL += process.env.HOST ? process.env.HOST : 'localhost:9080';

// once we switch from private beta to public beta remove this and the conditional
var betaProduction = process.env.NODE_ENV === 'production';

if (process.env.NODE_ENV !== 'enterprise') {
    var googleStrategy = new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: baseURL + '/auth/google/callback'

    }, function (accessToken, refreshToken, profile, done) {
        var findQuery = {email: profile.emails[0].value};
        var insertQuery = {
            email: profile.emails[0].value,
            provider: 'google',
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            profileImageUrl: profile.photos[0].value
        };
        if(betaProduction) {
            User.findOne(findQuery, function (err, user) {
                if(!user) {
                    return done(err, false, {betaProduction: betaProduction, message: 'Google sign in is not available at this time.'});
                }
                return done(err, user);
            });
        } else {
            User.findOrCreate(findQuery, insertQuery, function (err, user, created) {
                if (!created && user && !user.active) return done(err, false, {message: 'This account is not active.'});
                return done(err, user);
            });
        }
    });

    passport.use(googleStrategy);


} else {
    if (process.env.AUTH_PROTOCOL == 'LDAP') {
         var SamlStrategy = require('passport-saml').Strategy;
         var configPath = '../user/' + (process.env.subdomain) + '/src/config.json';
         var authConfig = require(configPath);

         var samlStrategy = new SamlStrategy({
            issuer: baseURL,
            path: baseURL + '/auth/ldap/callback',
            entryPoint: authConfig.auth.entryPoint,
            cert: authConfig.auth.cert
         },function(profile,done) {
            console.log("profile returned:: ");
            console.log(profile);
            if (!profile.email) {
                return done(new Error("No email found"),null);
            } 


         })

         passport.use(samlStrategy);

    }
}





// This is not a best practice, but we want to keep things simple for now
passport.serializeUser(function (user, done) {
    done(null, user._id);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});
