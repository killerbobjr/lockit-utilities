
var url = require('url');
var base32 = require('thirty-two');
var totp = require('notp').totp;

/**
 * Prevent users who aren't logged-in from accessing routes.
 * Use `loginRoute` for redirection. Function also remembers the requested url
 * and user is redirected after successful login.
 *
 * @example <caption>config.js</caption>
   exports.loginRoute = '/login';
 *
 * @example <caption>app.js</caption>
   var config = require('./config.js');
   app.get('/private', util.restrict(config), function(req, res) {
     res.send('only a logged in user can see this');
   })
 *
 * @param {Object} [config] - Configuration object
 * @param {String} [config.loginRoute='/login'] - Route that handles the login process
 */
exports.restrict = function(config) {

  // use empty object when no config provided
  config = config || {};

  // use default route when none specified
  var route = config.loginRoute || '/login';

  // simple restrict function from express auth example
  return function(req, res, next) {

    if (req.session.loggedIn) return next();

    // send only status code when rest and json is active
    if (config.rest) return res.send(401);

    // redirect to login page but save url the user really wanted to visit
    res.redirect(route + '?redirect=' + req.url);
  };

};

/**
 * Get type of database and database adapter name from connection string / object.
 *
 * @example <caption>config.js (CouchDB)</caption>
   exports.db = 'http://127.0.0.1:5984/';
 *
 * @example <caption>config.js (all other DBs)</caption>
   exports.db = {
     url: 'postgres://127.0.0.1:5432/',
     name: 'users',
     collection: 'my_user_table'
   }
 *
 * @example <caption>app.js</caption>
   var config = require('./config.js');
   var db = util.getDatabase(config);
   // {
   //   type: 'couchdb',
   //   adapter: 'lockit-couchdb-adapter'
   // }
 *
 * @param {Object} config - Configuration object
 * @param {String|Object} config.db - Database connection string / object
 *
 * @returns {Object} Object containing database `type` and `adapter`
 */
exports.getDatabase = function(config) {

  var uri = config.db.url || config.db;

  var urlObj = url.parse(uri);
  var prot = urlObj.protocol;

  var res = {};

  switch (prot) {
    case 'http:':
    case 'https:':
      res.type = 'couchdb';
      res.adapter = 'lockit-couchdb-adapter';
      break;
    case 'mongodb:':
      res.type = 'mongodb';
      res.adapter = 'lockit-mongodb-adapter';
      break;
    case 'postgres:':
      res.type = 'postgresql';
      res.adapter = 'lockit-sql-adapter';
      break;
    case 'mysql:':
      res.type = 'mysql';
      res.adapter = 'lockit-sql-adapter';
      break;
    case 'sqlite:':
      res.type = 'sqlite';
      res.adapter = 'lockit-sql-adapter';
      break;
  }

  return res;

};

/**
 * Generate image link to QR code.
 *
 * @example
   var config = {
     key: 'abcd1234',
     email: 'mirco.zeiss@gmail.com'
   };
   var link = util.qr(config);
   // https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=otpauth%3A%2F%2Ftotp%2FLockit%3Amirco.zeiss%40gmail.com%3Fsecret%3DMFRGGZBRGI2DI%3D%3D%3D%26issuer%3DLockit
 *
 * @param {Object} config - Configuration object
 * @param {String} config.key - Individual random key for user
 * @param {String} config.email - User email for Google Authenticator app
 * @param {String} [config.issuer='Lockit'] - Issuer for Google Authenticator
 *
 * @returns {String} URL for QR code
 */
exports.qr = function(config) {

  var key = config.key;
  var email = config.email;
  var issuer = config.issuer || 'Lockit';

  var label = issuer + ':' + email;
  var encoded = base32.encode(key);
  var uri = encodeURIComponent('otpauth://totp/' + label + '?secret=' + encoded + '&issuer=' + issuer);
  var api = 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=';
  return api + uri;

};

/**
 * Verify a two-factor authentication token.
 *
 * @example
   var key = 'abcd1234';
   var token = '236709';
   var valid = util.verify(token, key);
   if (valid) {
     // continue here
   }
 *
 * @param {String} token - The two-factor token to verify
 * @param {String} key - The individual key for the user
 * @param {Object} [options] - Options object for
 *   [notp#totp.verify](https://github.com/guyht/notp#totpverifytoken-key-opt)
 * @param {String} [options.window=6] - Allowable margin for counter
 * @param {Number} [options.time=30] - Time step of counter in seconds
 *
 * @returns {Boolean} `true` if token is valid
 */
exports.verify = function(token, key, options) {

  options = options || {};

  var verified = totp.verify(token, key, options);
  return (verified && verified.delta === 0) ? true : false;

};

/**
 * Destroy the current session. Works with cookie sessions and session stores.
 *
 * @example
   util.destroy(req, function() {
     // user is now logged out
   });
 *
 * @param {Object} req - The default Express request object
 * @param {Function} done - Function executed when session is destroyed
 */
exports.destroy = function(req, done) {

  if (req.sessionStore) return req.session.destroy(done);
  req.session = null;
  done();

};