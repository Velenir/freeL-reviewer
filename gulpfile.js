var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
// var imagemin = require('gulp-imagemin');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');

var runSequence = require('run-sequence');
var del = require('del');

var gulpUtil = require('gulp-util');
var babel = require('gulp-babel');

var NodeUglifier = require("node-uglifier");

var bases = {
	dist: 'dist/',
	css: 'dist/public/stylesheets/',
	temp: 'dist/temp/'
};

var paths = {
	mainjs: 'app.js',
	scripts: ['models/**/*.js', 'routes/**/*.js', 'app.js'],
	images: 'client/img/**/*',
	sass: 'public/stylesheets/**/*scss',
	toCopy: ['bin/**/*', 'package.json', 'public/**/*', '!public/stylesheets/**/*', 'views/**/*', 'node_modules/**/*']
};

gulp.task('babelify', function () {
	return gulp.src(paths.scripts, { base:'./'})
		.pipe(babel({presets: ['es2015']}))
		.pipe(gulp.dest(bases.temp));
});

gulp.task('node-uglify', ['babelify'], function(cb) {
	var nodeUglifier = new NodeUglifier(bases.temp + paths.mainjs);
	nodeUglifier.merge();

	//exporting
	nodeUglifier.exportToFile(bases.dist + "simpleMerge.js");
	nodeUglifier.exportSourceMaps(bases.dist + "sourcemaps/simpleMerge.js");
	//DONE
	console.log('MERGED');
	nodeUglifier.uglify();

	//exporting
	nodeUglifier.exportToFile(bases.dist + "simpleMergeAndUglify.js");
	nodeUglifier.exportSourceMaps(bases.dist + "sourcemaps/simpleMergeAndUglify.js");
	//DONE

	//in case you need it get the string
	//if you call it before uglify(), after merge() you get the not yet uglified merged source
	// var uglifiedString=nodeUglifier.toString();

	cb();

});

gulp.task('clean-temp', function () {
	return del([bases.temp]);
});

// Not all tasks need to use streams
// A gulpfile is just another node program and you can use any package available on npm
gulp.task('clean', function() {
	// You can use multiple globbing patterns as you would with `gulp.src`
	return del([bases.dist]); // Returns a Promise
});

gulp.task('build-scripts', function (callback) {
	runSequence('node-uglify', 'clean-temp', callback);
});

// gulp.task('build-scripts', function() {
//	 // Minify and copy all JavaScript (except vendor scripts)
//	 // with sourcemaps all the way down
//	 return gulp.src(paths.scripts)
//		 .pipe(sourcemaps.init())
//			 .pipe(babel({presets: ['es2015']}))
//			 .pipe(uglify().on('error', gulpUtil.log))
//			 .pipe(concat('app.js'))
//		 .pipe(sourcemaps.write())
//		 .pipe(gulp.dest(bases.dist));
// });

// Copy all static images
// gulp.task('buildimages', ['clean'], function() {
//	 return gulp.src(paths.images)
//		 // Pass in options to the task
//		 .pipe(imagemin({optimizationLevel: 5}))
//		 .pipe(gulp.dest('build/img'));
// });

// Build CSS from SASS
gulp.task('build-css', function() {
	return gulp.src(paths.sass)
		.pipe(sourcemaps.init())	// Process the original sources
			.pipe(sass().on('error', sass.logError))
		.pipe(sourcemaps.write()) // Add the map to modified source.
		.pipe(gulp.dest(bases.css));
});

// Copy one-for-one
gulp.task('copy', function () {
	return gulp.src(paths.toCopy, { base:'./'})
		.pipe(gulp.dest(bases.dist));
});

// Rerun the task when a file changes
gulp.task('watch', function() {
	gulp.watch(paths.scripts, ['build-scripts']);
	// gulp.watch(paths.images, ['images']);
});

// The default task (called when you run `gulp` from cli)
// gulp.task('default', ['watch', 'scripts', 'images']);
gulp.task('default', function (callback) {
	runSequence('clean', ['copy', 'build-scripts', 'build-css'], callback);
});
