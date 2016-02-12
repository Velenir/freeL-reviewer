var express = require('express');
var router = express.Router();

// if not logged in go to '/login_register'
function requireAuthorization(req, res, next) {
  console.log("IN requireAuthorization");
  if(req.user){
    return next();
    console.log("GOING NEXT");
  }

  console.log("REDIRECTING");
  // remember from where was redirected
  req.session.redirectedFrom = req.originalUrl;
  console.log("ORIGINAL URL", req.originalUrl);
  console.log("URL", req.url);
  res.redirect('/login_register');

  // res.render('login_register', {ops :{redirectedFrom: req.baseUrl + req.originalUrl, requrl: req.url, originalUrl: req.originalUrl, baseUrl: req.baseUrl, reqPath: req.path}, info: "Some Info"});
}

/* GET courses listing */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });

// routes other than above only accessible to logged-in users
router.all('/*', requireAuthorization);

/* GET course by id (whic is also its number) */
router.get('/:id', function(req, res, next) {
  res.send('respond with a COURSE resource');
});

/* GET courses week by week's number */
router.get('/:id/week:n', function(req, res, next) {
  res.send('respond with a Week ' + req.params.n +' resource');
});

// GET post assignment page
router.get('/:id/week:n/post', function(req, res, next) {
  res.render('post', { title: 'Submit your assignment',course: req.params.id, week: req.params.n, user: req.user });
});

// GET edit assignment page
router.get('/:id/week:n/edit', function(req, res, next) {
  res.render('post', { title: 'Edit your assignment', week: req.params.n, toEdit: true, user: req.user });
});


module.exports = router;
