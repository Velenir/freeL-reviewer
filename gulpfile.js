var gulp = require('gulp');
// var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');

var runSequence = require('run-sequence');
var del = require('del');
var vfs = require('vinyl-fs');
var gulpUtil = require('gulp-util');
var babel = require('gulp-babel');

var bases = {
	dist: 'dist/',
	css: 'dist/public/stylesheets/',
	images: 'dist/public/images/',
	toClean: ['dist/*', '!dist/.gitignore', '!dist/app.yaml']
};

var paths = {
	mainjs: 'app.js',
	scripts: ['models/**/*.js', 'routes/**/*.js', 'app.js'],
	images: 'public/images/**/*',
	sass: 'public/stylesheets/**/*scss',
	views: 'views/**/*',
	public: 'public/*',
	toCopy: ['bin/**/*', 'package.json']
};


// Not all tasks need to use streams
// A gulpfile is just another node program and you can use any package available on npm
gulp.task('clean', function() {
	return del(bases.toClean); // Returns a Promise, which gulp can chain
});

gulp.task('build-scripts', function() {
	// Minify and copy all JavaScript (except vendor scripts)
	// with sourcemaps all the way down
	return gulp.src(paths.scripts, { base:'./'})
		.pipe(sourcemaps.init())
		.pipe(babel({presets: ['es2015']}))
		.pipe(uglify().on('error', gulpUtil.log))
		// .pipe(concat('app.js'))
		.pipe(sourcemaps.write('/sourcemaps'))
		.pipe(gulp.dest(bases.dist));
});

// Copy and compress all static images
gulp.task('build-images', function() {
	return gulp.src(paths.images)
		.pipe(imagemin({optimizationLevel: 5}))
		.pipe(gulp.dest(bases.images));
});

// Build CSS from SASS
gulp.task('build-css', function() {
	return gulp.src(paths.sass)
		.pipe(sourcemaps.init())	// Process the original sources
		.pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
		.pipe(sourcemaps.write('/sourcemaps')) // Add the map to modified source.
		.pipe(gulp.dest(bases.css));
});

// Create symlink to node_modules instead of copying them
gulp.task('symlink', function () {
	return vfs.src('node_modules', {followSymLinks: false})
	.pipe(vfs.symlink(bases.dist));
});

// Copy one-for-one
gulp.task('copy', function () {
	// {base: './'} allows to copy files keeping their relative paths
	return gulp.src(paths.toCopy.concat(paths.views, paths.public), { base:'./'})
		.pipe(gulp.dest(bases.dist));
});

// Rerun the task when a file changes
gulp.task('watch', function() {
	gulp.watch(paths.scripts, ['build-scripts']);
	gulp.watch(paths.sass, ['build-css']);
	// gulp.watch(paths.images, ['images']);
});

// The default task (called when you run `gulp` from cli)
// gulp.task('default', ['watch', 'scripts', 'images']);
gulp.task('default', function (callback) {
	runSequence('clean', ['copy', 'symlink', 'build-scripts', 'build-css', 'build-images'], callback);
});
