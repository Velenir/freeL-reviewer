var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

//passport requirements
var mongoose = require('mongoose');
var passport = require('passport');
// var LocalStrategy = require('passport-local').Strategy;

var routes = require('./routes/index');
var users = require('./routes/users');
var course = require('./routes/course');
var about = require('./routes/about');

var app = express();

// console.log(`Version ${process.version}`);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
// NOTE { extended: true } allows to parse values of <input name="scores[#{ind}][#{i}]"> form as objects
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

var dbURI = process.env.MONGOLAB_URI || 'mongodb://localhost/dev_local';
// mongoose establish connection to db
mongoose.connect(dbURI, function(err){
	if(err) console.log('Connection error:', err);
});

// use MongoDB to store sessions
var store = new MongoStore({ mongooseConnection: mongoose.connection });

// Catch errors, useless now -- doesn't emit but throws
// store.on('error', function(error) {
// 	console.log('MongoDBStore error', error);
// });

//use express-session before passport.session()
app.use(session({
	secret: process.env.SESSION_SECRET|| 'keyboard cat',
	resave: false,
	saveUninitialized: false,
	store: store
}));
//use passport
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));

// Pass req.user to every template
app.use(function (req, res, next) {
	res.locals.user = req.user;
	next();
});

app.use('/', routes);
app.use('/users', users);
app.use('/course', course);
app.use('/about', about);


// passport config
var Account = require('./models/account');

// passport.use(new LocalStrategy(Account.authenticate()));
passport.use(Account.createStrategy()); //better

passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());


// mongoose.connection.once('open', function(){
//	 console.log('Opened Connection');
//	 Account.find({}, function(err, users){
//		 console.log('USERS:', users);
//	 });
// });

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function () {
	console.log('Mongoose default connection open ');
});

// If the connection throws an error
mongoose.connection.on('error',function (err) {
	console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
	console.log('Mongoose default connection disconnected');
});

// TODO:10 remove later
// app.use(function(req, res, next){
//	 console.log('SESSION:', req.session);
// });


// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});


module.exports = app;
