// gulp
var gulp = require('gulp');

// plugins
var connect = require('gulp-connect');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var clean = require('gulp-clean');
var runSequence = require('run-sequence');
var ngAnnotate = require('gulp-ng-annotate');

// tasks
gulp.task('lint', function() {
  gulp.src(['./app/**/*.js', '!./app/public/bower_components/**'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});
gulp.task('clean', function() {
  return gulp.src('./dist/public', {read: false})
      .pipe(clean());
});
gulp.task('minify-css', function() {
  var opts = {comments:true,spare:true};
  gulp.src(['./app/**/*.css', '!./app/public/bower_components/**'])
    .pipe(minifyCSS(opts))
    .pipe(gulp.dest('./dist/'))
});
gulp.task('minify-js', function() {
  gulp.src(['./app/**/*.js', '!./app/public/bower_components/**'])
    .pipe(ngAnnotate())
    .pipe(uglify({
      // inSourceMap:
      // outSourceMap: "app.js.map"
    }))
    .pipe(gulp.dest('./dist/'))
});
gulp.task('copy-bower-components', function () {
  gulp.src('./app/public/bower_components/**')
    .pipe(gulp.dest('./dist/public/bower_components'));
});
gulp.task('copy-html-files', function () {
  gulp.src('./app/**/*.html')
    .pipe(gulp.dest('./dist/'));
});
gulp.task('connect', function () {
  connect.server({
    root: 'app/public',
    port: 8888
  });
});
gulp.task('connectDist', function () {
  connect.server({
    root: 'dist/public',
    port: 9999
  });
});


// default task
gulp.task('default',
  ['lint', 'connect']
);
gulp.task('build', function() {
  runSequence(
    'clean',
    ['lint', 'minify-css', 'minify-js', 'copy-html-files', 'copy-bower-components']
  );
});