var express = require('express');

//require passport
var passport = require('passport');
var Account = require('../models/account');

var router = express.Router();

// if not logged in go to '/login_register'
function requireAuthorization(req, res, next) {
  if(req.user){
    return next();
  }
  // remember from where was redirected

  res.render('login_register', {redirectedFrom: req.baseUrl + req.originalUrl, requrl: req.url, originalUrl: req.originalUrl, baseUrl: req.baseUrl, reqPath: req.path, routePath: router.path()});
}

// if already logged in don't go to /register or /login
function alreadyLoggedIn(req, res, next) {
  if(req.user){
    return res.redirect('/');
  }
  next();
}


/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', { user : req.user });
});

// when accessing /register or /login when already logged in rediret to '/'
router.all(['/register', '/login', '/login_register'], alreadyLoggedIn);

// Get register page
router.get('/register', function(req, res) {
    res.render('register', { });
});

// On Register form submission
router.post('/register', function(req, res) {
    Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
        if (err) {
          return res.render("register", {info: "Sorry. That username already exists. Try again."});
        }

        passport.authenticate('local')(req, res, function () {
          if(req.body.redirectedFrom)
          // redirect back from whence user came
            res.redirect(req.body.redirectedFrom);
          else
            res.redirect('/');
        });
    });
});



// Get Login page
router.get('/login', function(req, res) {
    res.render('login', { user : req.user });
});

// On Login form submission
router.post('/login', function(req, res, next) {
    // try to authenticate
  passport.authenticate('local', function(err, user, info) {
    //   propagate any exceptions
    if (err) { return next(err); }
    //  if authentication failed
    if (!user) {
      return res.render('login', {info: info});
    }
    //  if authentication succeeded establish a user session
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      // redirect back from whence user came
      if(req.body.redirectedFrom) return res.redirect(req.body.redirectedFrom);

      return res.redirect('/');
    //   return res.redirect('/users/' + user.username);
    });
  })(req, res, next);
});

// Logout
router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});



// routes other than above only accessible to logged-in users
router.all('/*', requireAuthorization);

// GET post assignment page
router.get('/week:id/post', function(req, res, next) {
  res.render('post', { title: 'Submit your assignment', week: req.params.id });
});

// GET edit assignment page
router.get('/week:id/edit', function(req, res, next) {
  res.render('post', { title: 'Edit your assignment', week: req.params.id, toEdit: true });
});

module.exports = router;
