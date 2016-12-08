var mongoose = require( 'mongoose' );
var Schema = mongoose.Schema;
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var findOrCreate = require('mongoose-findorcreate');

var userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true
    },
    firstName: String,
    lastName: String,
    profileImageUrl: String,
    provider: String, 
    hash: String,
    salt: String,
    activated: {
        type: Boolean,
        default: false
    },
    _team: {type: Schema.Types.ObjectId, ref: 'Team'},
    // role: {
    //     type: String,
    //     enum: ['Admin', 'Editor', 'Viewer'],
    //     default : 'Admin'
    // },
    invited: Array //tmp array for user hasnt confirmed invitation
}, {timestamps:true});

userSchema.plugin(findOrCreate);



userSchema.methods.setPassword = function(password){
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64,'sha512').toString('hex');
};

userSchema.methods.validPassword = function(password) {
    var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64,'sha512').toString('hex');
    return this.hash === hash;
};

userSchema.methods.isSuperAdmin = function() {
    return (this.email.indexOf('schemadesign.com') >= 0 || this.email.indexOf('arrays.co') >= 0)
};


module.exports = mongoose.model('User', userSchema);
