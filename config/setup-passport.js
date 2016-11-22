var passport = require('passport');
var LocalStrategy= require('passport-local');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var User = require('../app/models/users');

var localStrategy = new LocalStrategy({
    usernameField: "email",
    passwordField: "password"
},function(email,password,done) {
    User.findOne({email:email},function(err,user) {
        if (err) {return done(err);}
        if (!user) {return done(null,false,{message: "user not found"});}
        if (!user.activated) {
            var link = '/api/user/'+ user._id + '/resend?emailType=activation';
            return done(null,false,{message:"activation pending",link: link})

        ;}
        if (!user.validPassword(password)) {return done(null,false,{message:"wrong password"});}
        return done(null,user);
    })
})



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

passport.use(localStrategy);

passport.use(googleStrategy)


// This is not a best practice, but we want to keep things simple for now
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});
