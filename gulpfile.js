'use strict';
const $ = require('gulp-load-plugins')(); // автозагрузка плагинов. некоторые доподключаем ниже если не подключились

const gulp = require('gulp'), // Сам галп
    browserSync = require('browser-sync').create(), // LiveReload перезагрузка страницы при изменениях
    del = require('del'), // пакет для удаления папок || файлов
    // path = require('path'), // скоро понадобится
    fs = require('fs'),
    pngquant = require('imagemin-pngquant'); // Подключаем библиотеку для работы с png


gulp.task('plug', function () { // посмотрим какие плагины подключились и какие названия
    console.log($);
});
// Опции
const options = {
    appName: 'app', // когда пакуем в zip то будет это название
    isDev: true, // при разработке true, если хотите скомпилировать в продакшен ставим false
    htmlMin: false, // false не сжимем pug на выходе, true сжимаем
    notify: false, // false отключает чудо-надоедливые посказки browser-sync
    devFolder: './app', // рабочая папка
    distFolder: './public', // папка с выходным проектом
    autoprefixer: [
        'last 3 versions',
        'ie >= 9',
        'Android >= 2.3'
    ], // на сколько версий браузеров ставить префиксы
};

// Пути к файлам
const PATHS = {
    node: './node_modules',
    pug: options.devFolder + '/pug/*.pug',
    allPug: options.devFolder + '/pug/**/*.pug',
    sass: options.devFolder + '/stylesheet/**/*.scss',
    images: options.devFolder + '/images/**/*.{png,jpg,gif}',
    js: options.devFolder + '/javascript/**/*',
    fonts: options.devFolder + '/fonts/**/*',
    favicon: options.devFolder + '/favicon/**/*',
    jsonPug: options.devFolder + '/pug/json/pug-variables.json',
};

// массив javascript
var allJavaScripts = [ // подключаем все скрипты проекта здесь. причём в каком порядке подключим в том и собирётся
    PATHS.node + '/jquery/dist/jquery.min.js', // jquery 3.2.1
    PATHS.node + '/foundation-sites/dist/js/foundation.js', // foundation js
    options.devFolder + '/javascript/app.js', // главный файл для работы с js. Желательно подключать последним
];


// del
gulp.task('clean', function () { // удаляет всю папку генерируемую в продакшен или при разработке
    return del.sync(options.distFolder);
});


// Компиляция pug 
gulp.task('pug', function () {
    return gulp.src(PATHS.pug) // берём все файлы
        .pipe($.data(function(file) {
            return JSON.parse(fs.readFileSync(PATHS.jsonPug));
        }))
        .pipe($.pug({ // компилим в pug
            pretty: !options.htmlMin,
            cache: true,
        }).on('error', $.notify.onError({
            message: "<%= error.message %>",
            title: "Pug Error"
        })))
        .pipe($.size({
            title: 'pug'
        }))
        .pipe(gulp.dest(options.distFolder))
});

gulp.task('pug:watch', ['pug'], function (done) {
    browserSync.reload();
    done();
});

// Копируем php
gulp.task('php', function () {
    return gulp.src(options.devFolder + './php/**/*') // берём все php
        .pipe(gulp.dest(options.distFolder + '/php')); // переносим в public
});
// Работа с картинками
gulp.task('img', function () {
    return gulp.src(PATHS.images) // Берем все изображения
        .pipe($.cache($.imagemin({ // Сжимаем их с наилучшими настройками с учетом кеширования
            interlaced: true,
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        })))
        .pipe($.size({
            title: 'images'
        }))
        .pipe(gulp.dest(options.distFolder + '/images')) // Выгружаем на продакшен
});
gulp.task('img:watch', ['img'], function (done) {
    browserSync.reload();
    done();
});

// Копируем fonts
gulp.task('fonts', function () {
    return gulp.src(PATHS.fonts) // берём все в папке fonts
        .pipe($.size({
            title: 'fonts'
        }))
        .pipe(gulp.dest(options.distFolder + '/fonts')) // переносим в public
        .pipe(browserSync.stream());
});

gulp.task('fonts:watch', ['fonts'], function (done) {
    browserSync.reload();
    done();
});
// Копируем favicon
gulp.task('favicon', function () {
    return gulp.src(PATHS.favicon)
        .pipe($.cache($.imagemin({ // Сжимаем их с наилучшими настройками с учетом кеширования
            interlaced: true,
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        })))
        .pipe($.size({
            title: 'favicon'
        }))
        .pipe(gulp.dest(options.distFolder + '/favicon'));
});


// Запускаем сервер
gulp.task('serve', [
    'clean',
    'fonts',
    'php',
    'scripts',
    'favicon',
    'img',
    'sass',
    'pug',
    'watch'
], function () {

    browserSync.init({
        server: options.distFolder,
        notify: options.notify
    });
});

// Компилим sass || scss
gulp.task('sass', function () {
    return gulp.src(PATHS.sass) // берём все файлы
        .pipe($.if(options.isDev, $.sourcemaps.init())) // sourcemap при разработке
        .pipe($.sass()
            .on('error', $.notify.onError({
                message: "<%= error.message %>",
                title: "Sass Error"
            })))
        .pipe($.autoprefixer({browsers: options.autoprefixer, cascade: true})) // добавляем префиксы
        .pipe($.if(!options.isDev, $.cssnano())) // сжимаем если на продакшен
        .pipe($.if(options.isDev, $.sourcemaps.write())) // sourcemap при разработке
        .pipe(gulp.dest(options.distFolder + '/stylesheet')) // выгружаем
        .pipe($.if(!options.isDev, $.cleanCss()))
        .pipe($.size({
            title: 'css'
        }))
        .pipe(browserSync.stream()); // инжектим без перезагрузки
});


// javascripts
gulp.task('scripts', function () { // берём все файлы скриптов
    return gulp.src(allJavaScripts) // 
        .pipe($.if(options.isDev, $.sourcemaps.init())) // sourcemap при разработке
        .pipe($.concat('app.min.js')) // Собираем их в кучу в новом файле
        .pipe($.if(!options.isDev, $.uglify())) // Сжимаем JS файл если на продакшен
        .pipe($.if(options.isDev, $.sourcemaps.write())) // sourcemap при разработке
        .pipe($.size({
            title: 'js'
        }))
        .pipe(gulp.dest(options.distFolder + '/javascript')) // Выгружаем в папку
});

gulp.task('js:watch', ['scripts'], function (done) {
    browserSync.reload();
    done();
});

// смотрим за файлами
gulp.task('watch', function () {
    gulp.watch(PATHS.sass, ['sass']); // наблюдаем за файлами и при изменениях выполняем таск
    gulp.watch([PATHS.allPug, PATHS.jsonPug], ['pug:watch']); // наблюдаем за файлами и при изменениях выполняем таск
    gulp.watch(PATHS.fonts, ['fonts:watch']); // наблюдаем за файлами и при изменениях выполняем таск
    gulp.watch(PATHS.images, ['img:watch']); // наблюдаем за файлами и при изменениях выполняем таск
    gulp.watch(PATHS.js, ['js:watch']); // наблюдаем за файлами и при изменениях выполняем таск
    gulp.watch(PATHS.php, ['php']); // наблюдаем за файлами и при изменениях выполняем таск
});


// defaul task
gulp.task('default', ['serve'], function () {
    console.log('Поехали!!!');
});


// prod task
gulp.task('production', [
    'clean',
    'fonts',
    'favicon',
    'scripts',
    'img',
    'sass',
    'pug'
], function () {
    console.log('А я вот день рождения не буду справлять...\nвсё зае....\nэммм...\nВсё скомпилировано, сэр!!!');
});


// Архивирование проекта
gulp.task('zip', ['production'], function () {
    gulp.src(options.distFolder + '/**/*')
        .pipe($.zip(options.appName + '.zip'))
        .pipe($.size({
            title: options.appName + '.zip'
        }))
        .pipe(gulp.dest(''));
});
