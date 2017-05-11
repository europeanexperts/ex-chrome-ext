'use strict';

var gulp = require('gulp');

// js variables
var uglify  = require('gulp-uglify');
var jshint  = require('gulp-jshint');
var concat  = require('gulp-concat');
var watch   = require('gulp-watch');
var plumber = require('gulp-plumber');

// pug vabiables
var pug = require('gulp-pug');

// scss variables
var sass = require('gulp-sass');

// postcss variables
var postcss      = require('gulp-postcss');
var sourcemaps   = require('gulp-sourcemaps');
var autoprefixer = require('autoprefixer');
var cssnano      = require('gulp-cssnano');

var paths = {
  css      : ['public/css/**/*.css'],
  js       : ['public/js/*.js'],
  jsWatch  : ['public/js/includes/**/*.js', 'public/js/includes/**/*.min.js'],
  scss     : ['public/scss/**/*.scss'],
  pug      : ['public/pug/*.pug'],
  pugWatch : ['public/pug/**/*.pug']
};

gulp.task('pug', function() {
  return gulp.src(paths.pug)
    .pipe(plumber())
    .pipe(pug({pretty: true}))
    .pipe(gulp.dest('public/html'));
});

gulp.task('scss', function () {
  return gulp.src(paths.scss)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('public/css'));
});

gulp.task('css:minify', function () {
  return gulp.src(paths.css)
    .pipe(cssnano())
    .pipe(postcss([ autoprefixer({ browsers: ['ie >= 10', 'last 4 versions', '> 1%'] }) ]))
    .pipe(gulp.dest('public/css'));
});

gulp.task('js', function () {
  return gulp.src(paths.jsWatch)
    .pipe(concat('main.js'))
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(gulp.dest('public/js'));
});

gulp.task('js:minify', function () {
  return gulp.src(paths.js)
    .pipe(uglify())
    .pipe(gulp.dest('public/js'));
});

gulp.task('watcher', function () {
  gulp.watch(paths.pugWatch, ['pug']);
  gulp.watch(paths.scss, ['scss']);
  gulp.watch(paths.jsWatch, ['js']);
});

gulp.task('build', ['css:minify', 'js:minify'], function () {
  console.log('Build success');
});