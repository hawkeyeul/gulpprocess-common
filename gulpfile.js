var gulp = require('gulp');
var creds = require('./settings.js');
var args = require('yargs').argv;
var $ = require('gulp-load-plugins')({
	lazy: true
});
var watch = require('gulp-watch');
var connect = require('gulp-connect');
var merge = require('merge-stream');
var config = require('./gulp.config.js')();
var copydir = require('copy-dir');
var execFile = require('child_process').execFile;
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;




var spauth = require('node-sp-auth');
var spsave = require('spsave').spsave;
var request = require('request-promise');


var startDate = new Date();
var del = require('del');
var path = require('path');
var glob = require('glob');

var globalAppOptions = config.globalAppOptions;
var environmentOptions = config.environmentOptions;
var currentEnvironment = environmentOptions.envDev;
var apps = config.apps;
var version = require(config.versionFile).version;
var preVersion = version;
var revNumber = '';
var destGlobs = [];


//entry points
gulp.task('build-dev', ['set-env-dev', 'set-rev-number', 'clean-dest', 'build'], function() { });

gulp.task('build-qa', ['set-env-qa', 'set-rev-number', 'clean-dest', 'build'], function() { });

gulp.task('build-stage', ['set-env-stage', 'set-rev-number', 'build'], function() { });

gulp.task('build-prod', ['set-env-prod', 'set-rev-number', 'build'], function() { });

//set currentEnvironment 
gulp.task('set-env-dev', function(cb) {
	buildEnv(environmentOptions.envDev);
	cb();
});

gulp.task('set-env-qa', function(cb) {
	buildEnv(environmentOptions.envQA);
	cb();
});

gulp.task('set-env-stage', function(cb) {
	buildEnv(environmentOptions.envStage);
	cb();

});

gulp.task('set-env-prod', function(cb) {
	buildEnv(environmentOptions.envProd);
	cb();
});

gulp.task('set-rev-number', function(cb) {
	revNumber = buildRev();
	cb();
});



var buildDependencies = function() { // used to omit watches unless the build should be served locally. Execution order requires this to be above the gulp build task
	var dependencies = ['build-html'];
	if (args.serve) {
		dependencies = dependencies.concat(['watch:html', 'watch:styles', 'watch:js', 'watch:images']);
	}
	return dependencies;
};

//main build task that tells gulp to run kick off building files and attach watches 
gulp.task('build', buildDependencies(), function() {
	log('Application Built');
	if (args.serve) { // run the local server is argument has been passed in
		return runServer(currentEnvironment);
	}
});

gulp.task('push-prod', function() {
	buildEnv(environmentOptions.envProd);
	pushFilesToRemote();
});

gulp.task('push-stage', function() {
	buildEnv(environmentOptions.envStage);
	pushFilesToRemote();
});

gulp.task('push-qa', function() {
	buildEnv(environmentOptions.envQA);
	pushFilesToRemote();
});

gulp.task('push-dev', function() {
	buildEnv(environmentOptions.envDev);
	pushFilesToRemote();
});


gulp.task('appversion', function() {
	var env = 'prod';
	var oldver = version;
	var vchange = false;

	if (args.major || args.minor || args.build) {
		incrementVersion(args);
		vchange = true;
	}

	if (vchange) {
		log(`

Previous application version ${oldver}
New application version ${version}
		`);
	} else {
		log(`
	
The application's current version is: ${version}
	
Usage:
 gulp Incrementing version numbers
  gulp appversion --major
  gulp appversion --minor
  gulp appversion --build
			
 View current version number and this message
  gulp appversion
		
	`);
	}
});


gulp.task('watch:html', function() {
	if (args.serve) {
		gulp.watch(config.source + '*.html', ['build-html']);
	}
});

gulp.task('watch:styles', function() {
	if (args.serve) {
		return gulp.watch([].concat(globalAppOptions.css, globalAppOptions.scss, globalAppOptions.less), ['build-app-styles', 'build-html']);
	}
});

gulp.task('watch:js', function() {
	if (args.serve) {
		gulp.watch(config.source + '**/*.js', ['build-classes-js', 'build-app-js', 'build-html']);
	}
});

gulp.task('watch:images', function() {
	if (args.serve) {
		gulp.watch(globalAppOptions.images, ['build-app-images', 'build-html']);
	}
});

gulp.task('watch:views', function() {
	if (args.serve) {
		var views = [];

		for (var a = 0; a < apps.length; a++) {
			var currentApp = apps[a];
			if (currentApp.appViews) {
				views.concat(currentApp.appViews);
				gulp.watch(views, ['build-app-views', 'build-html']);
			}
		}
	}
});

gulp.task('clean-dest', function(cb) {
	del.sync([currentEnvironment.path], cb);
});


gulp.task('build-files', [
	'build-app-styles',
	'build-classes-js',
	'build-app-js',
	'build-app-views',
	'build-app-images',
	'build-app-files'
], function(cb) {
	log('Files Created');
	setTimeout(cb, 2000);
});

gulp.task('build-html', ['build-files'], function() {
	log('Building html files');
	var curApp = 0;
	var ca = null;
	if (apps.length > 0) {
		ca = apps[curApp];
	}

	for (var a = 0; a < apps.length; a++) {
		var currentApp = apps[a];
		if (apps[a].appHTML) {

			var dest = (currentApp.appFolder) ? currentEnvironment.path + currentApp.appFolder : currentEnvironment.path;
			var buildFolder = (currentApp.appFolder) ? currentEnvironment.buildFolder + '/' + currentApp.appFolder : currentEnvironment.buildFolder;

			gulp.src(currentApp.appHTML)
				.pipe($.cheerio((CO, file, done) => {
					CO('#styles').replaceWith(stylesHTML(ca));
					CO('#scripts').replaceWith(scriptsHTML(ca));
					CO('#remoteAccess').replaceWith(remoteAccess());
					curApp++;
					ca = apps[curApp];
					done();
				}
				))
				.pipe($.inject(gulp.src(projectFiles(currentApp))
					.pipe($.if(currentEnvironment.buildType === 'local', $.rename(function(path) {
						path.basename = (args.local) ? path.basename : path.basename + '.' + revNumber;
					}))), { relative: false, ignorePath: buildFolder, addRootSlash: false }))
				.pipe($.rename(function(path) {
					path.extname = (args.serve) ? '.html' : '.aspx';
				}))
				.pipe(gulp.dest(dest))
				.pipe(connect.reload());
		}
	}
});

gulp.task('build-app-styles', function() {
	log('Building App Styles');

	var styles = {
		css: null,
		less: null,
		scss: null,
		dest: null
	};

	for (var a = 0; a < apps.length; a++) {
		var currentApp = apps[a];
		styles = {
			css: currentApp.appCSS,
			less: currentApp.appLESS,
			scss: currentApp.appSCSS,
			fileName: currentApp.cssName,
			dest: (currentApp.appFolder) ? currentEnvironment.path + currentApp.appFolder : currentEnvironment.path
		};
		buildStyles(styles);
	}

	if (globalAppOptions) {
		styles = {
			css: globalAppOptions.css,
			less: globalAppOptions.less,
			scss: globalAppOptions.scss,
			fileName: globalAppOptions.cssName,
			dest: currentEnvironment.path
		};
		buildStyles(styles);
	}
});

gulp.task('build-classes-js', function() {
	log('Building Classes JS');
	if (globalAppOptions) {
		return buildJS(globalAppOptions.classesJS, globalAppOptions.className, currentEnvironment.path);
	}
});

gulp.task('build-app-js', function() {

	log('Building Application JS files');
	for (var a = 0; a < apps.length; a++) {
		var currentApp = apps[a];

		if (currentApp.appJs) {
			buildJS(currentApp.appJs, currentApp.appName + '.js', (currentApp.appFolder) ? currentEnvironment.path + currentApp.appFolder : currentEnvironment.path);
		}
	}
});

gulp.task('build-app-copy-files', function() {
	log('Building App Extra Files');
});

gulp.task('build-app-images', function() {

	log('Building App Images');
	for (var a = 0; a < apps.length; a++) {
		var currentApp = apps[a];
		if (currentApp.images) {
			if (currentApp.images.length > 0) {
				copyFiles(currentApp.images, ((currentApp.appFolder) ? currentEnvironment.path + currentApp.appFolder : currentEnvironment.path) + 'images/');
			}
		}
	}
	if (globalAppOptions) {
		return copyFiles(globalAppOptions.images, currentEnvironment.path + 'images/');
	}
});

gulp.task('build-app-files', function() {
	log('Building App Files');
	for (var a = 0; a < apps.length; a++) {
		var currentApp = apps[a];
		if (currentApp.files) {
			currentApp.files.map((f) => {
				var path = (currentApp.appFolder) ? currentEnvironment.path + currentApp.appFolder : currentEnvironment.path;
				var dest = (f.dest) ? path + f.dest : path;
				gulp.src(f.src)
					.pipe(gulp.dest(dest));
			});
		}
	}
	if (globalAppOptions) {
		if (globalAppOptions.files) {
			if (globalAppOptions.files.length > 0) {
				globalAppOptions.files.map((f) => {
					var dest = (f.dest) ? currentEnvironment.path + f.dest : currentEnvironment.path;
					gulp.src(f.src)
						.pipe(gulp.dest(dest));
				});
			}
		}
	}
});

gulp.task('build-app-views', function() {

	log('Building Application JS files');
	for (var a = 0; a < apps.length; a++) {
		var currentApp = apps[a];
		if (currentApp.appViews) {
			var path = ((currentApp.appFolder) ? currentEnvironment.path + currentApp.appFolder : currentEnvironment.path) + currentApp.appName + '-views/';
			copyViews(currentApp.appViews, path);
		}
	}
});

gulp.task('archive-previous', function(cb) {
	archiveApp(cb);
});

var archiveFiles = function(src, dest, cb) {
	//TODO
	gulp.src(src)
		.pipe(gulp.dest(dest))
		.on('end', cb);
};


var archiveApp = function(cb) {
	var date = new Date();
	var timestamp = date.getDate() + date.getTime();

	archiveFiles(
		[currentEnvironment.path + '**/*.*', '!' + currentEnvironment.path + 'images{,/**}', '!' + currentEnvironment.path + 'archive{,/**}'],
		currentEnvironment.path + '/archive/' + timestamp + '/', cb);
};

var buildJS = function(src, output, dest) {
	return gulp
		.src(src)
		.pipe($.if(currentEnvironment.buildType === 'devqa', $.sourcemaps.init()))
		.pipe($.if(currentEnvironment.buildType === 'devqa', $.concat(addFileRev(output, revNumber))))
		.pipe($.if(currentEnvironment.buildType === 'stageprod', $.uglify()))
		.pipe($.if(currentEnvironment.buildType === 'devqa', $.sourcemaps.write('.')))
		.pipe($.if(currentEnvironment.buildType === 'local', $.rename(function(path) {
			path.dirname = path.dirname;
			path.basename = path.basename + '.' + revNumber;
			path.extname = path.extname;
		})))
		.pipe(gulp.dest(dest));
};

var displayVersion = function(env) {
	log('Current version of ' + env + ' is ' + versions[env]);
};

var incrementVersion = function(arguments) {
	var ver = version.split('.');
	ver = ver.map(function(num) {
		return parseInt(num);
	});

	if (arguments.build) {
		ver[2] += 1;
	}

	if (arguments.minor) {
		ver[1] += 1;
		ver[2] = 0;
	}

	if (arguments.major) {
		ver[0] += 1;
		ver[1] = 0;
		ver[2] = 0;
	}

	version = `${ver[0]}.${ver[1]}.${ver[2]}`;
	gulp.src(config.versionFile)
		.pipe($.jsonModify({
			key: 'version',
			value: version
		}))
		.pipe(gulp.dest('./'));
};


var buildStyles = function(styles) {

	if (!styles.css && !styles.less && !styles.scss) {
		return null;
	}

	if (styles.less) {
		if (styles.less.length > 0) {
			gulp.src(styles.less)
				.pipe($.if((currentEnvironment.buildType !== 'local'), $.concat(styles.fileName)))
				.pipe($.rename(function(path) {
					path.dirname = path.dirname;
					path.basename = path.basename + '.less.' + revNumber;
					path.extname = path.extname;
				}))
				.pipe($.if(currentEnvironment.buildType === 'devqa', $.lessSourcemap()))
				.pipe($.if(currentEnvironment.buildType === 'local', $.less()))
				.pipe($.autoprefixer({ browsers: ['last 2 versions', '> 5%'] }))
				.pipe($.if(currentEnvironment.buildType !== 'local', $.csso()))
				.pipe(gulp.dest(styles.dest));
		}
	}

	if (styles.scss) {
		if (styles.scss.length > 0) {
			gulp.src(styles.scss)
				.pipe($.if((currentEnvironment.buildType === 'devqa'), $.sourcemaps.init()))
				.pipe($.if((currentEnvironment.buildType !== 'local'), $.concat(styles.fileName)))
				.pipe($.rename(function(path) {
					path.dirname = path.dirname;
					path.basename = path.basename + '.scss.' + revNumber;
					path.extname = path.extname;
				}))
				.pipe($.sass())
				.pipe($.autoprefixer({ browsers: ['last 2 versions', '> 5%'] }))
				.pipe($.if(currentEnvironment.buildType !== 'local', $.csso()))
				.pipe($.if(currentEnvironment.buildType === 'devqa', $.sourcemaps.write('.')))
				.pipe(gulp.dest(styles.dest));
		}
	}

	if (styles.css) {
		if (styles.css.length > 0) {
			gulp.src(styles.css)
				.pipe($.if((currentEnvironment.buildType === 'devqa'), $.sourcemaps.init()))
				.pipe($.if((currentEnvironment.buildType !== 'local'), $.concat(styles.fileName)))
				.pipe($.rename(function(path) {
					path.dirname = path.dirname;
					path.basename = path.basename + '.' + revNumber;
					path.extname = path.extname;
				}))
				.pipe($.autoprefixer({ browsers: ['last 2 versions', '> 5%'] }))
				.pipe($.if(currentEnvironment.buildType !== 'local', $.csso()))
				.pipe($.if(currentEnvironment.buildType === 'devqa', $.sourcemaps.write('.')))
				.pipe(gulp.dest(styles.dest));
		}
	}
};

var copyViews = function(src, dest) {
	return gulp
		.src(src)
		.pipe($.rename(function(path) {
			path.extname = (args.serve) ? '.html' : '.aspx';
		}))
		.pipe(gulp.dest(dest));
};





var copyFiles = function(src, dest) {
	// var syncy = require('syncy');
	// var s = [].concat(src);
	// if (s.length > 0) {
	// 	syncy(src, dest)
	// 		.then(() => {
	// 			if (cb) {
	// 				cb();
	// 			}
	// 		});
	// }

	var s = [].concat(src);
	if (s.length > 0) {
		var globs = s;
		globs.map(function(g) {
			glob.sync(g).forEach(f => {
				gulp.src(f)
					.pipe(gulp.dest(dest));
				//fs = fs.concat(currentEnvironment.path + path.basename(f, fileType) + '.' + revNumber + fileType);
			});
		});
	}
};

var projectFiles = function(currentApp) {
	var files = [];
	var basePath = currentEnvironment.path;

	var appPath = (currentApp.appFolder) ? basePath + currentApp.appFolder : basePath;
	files = files.concat(basePath + '*.css');
	if (currentApp.appCSS) {
		files = files.concat(appPath + '*.css');
	}

	if (args.local !== true) {
		if (globalAppOptions) {
			files = files.concat(basePath + addFileRev(globalAppOptions.className, revNumber));
		}
		if (appPath != basePath) {
			files = files.concat(appPath + '*.js');
		} else {
			files = files.concat(appPath + currentApp.appName + '.' + revNumber + '.js');
		}

	} else {
		if (globalAppOptions) {
			files = files.concat(basePath + stripPath(globalAppOptions.classesJS, '.js'));
		}
		if (currentApp.appJs) {
			files = files.concat(appPath + stripPath(currentApp.appJs, '.js', currentApp.appFolder));
		}
	}

	return files;
};

var stripPath = function(glbs, fileType, appFolder) {
	var fs = [];

	var globs = [].concat(glbs);
	globs.map(function(g) {
		glob.sync(g).forEach(f => {
			fs = fs.concat(currentEnvironment.path + path.basename(f, fileType) + '.' + revNumber + fileType);
		});
	});
	return fs;
};

var stylesHTML = function() {
	var html = `\n`;
	currentEnvironment.extCSSPaths.map(function(css) {
		html += `	<link rel="stylesheet" href="${css}" /> \n`;
	});
	html += `\n	<!-- inject:css -->\n	<!-- endinject -->\n`;
	return html;
};

var scriptsHTML = function(currentApp) {
	var html = `\n`;
	currentEnvironment.extJSPaths.map(function(js) {
		html += `<script src="${js}"></script>\n`;
	});


	if (currentApp.extAppJs) {
		var extAppJs = [].concat(currentApp.extAppJs);
		if (extAppJs.length > 0) {
			var globs = extAppJs;
			globs.map(function(g) {
				if (args.local) {
					glob.sync(g.src).forEach(f => {
						html += `<script src="${swapSrcToBuild(f, g.appName)}"></script>`;
					});
				} else {
					html += `<script src="${swapSrcToBuild(g.src, g.appName)}"></script>`;
				}

			});
		}
	}




	html += `\n<!-- inject:js -->\n<!-- endinject -->\n`;
	return html;
};

var swapSrcToBuild = function(file, appName) {
	var appOptions = null;
	var fileOut = '';
	var fl = path.basename(file);
	var ext = path.extname(file);
	var folder = '';
	if (appName) {
		for (var i = 0; i < apps.length; i++) {
			if (apps[i].appName === appName) {
				appOptions = apps[i];
				folder = '../';
				if (appOptions.appFolder) {
					folder = folder + appOptions.appFolder;
				}
				i = apps.length;
			}
		}
	}

	if (args.local) {
		fileOut = folder + addFileRev(fl, revNumber);
	} else {
		fileOut = folder + appOptions.appName + '.' + revNumber + ext;
	}
	return fileOut;
};

var remoteAccess = function() {
	var html = `\n		<script>var devUtils = window.open('${currentEnvironment.remoteAccessPage}');</script>\n
		<script src="${currentEnvironment.remoteAccessScript}"></script>\n`;
	return html;
};

var log = function(msg) {
	if (typeof (msg) === 'object') {
		for (var item in msg) {
			if (msg.hasOwnProperty(item)) {
				$.util.log($.util.colors.blue(msg[item]));
			}
		}
	} else {
		$.util.log($.util.colors.blue(msg));
	}
};

var addFileRev = function(file, rev) {
	var fileRev = '';
	var fileParts = file.split('.');
	if (fileParts.length > 0) {
		var ext = fileParts[fileParts.length - 1];
		fileParts.pop();
		fileParts.map(function(fp) { fileRev += fp + '.'; });
		fileRev += rev + '.' + ext;
		return fileRev;
	}
	return file;
};

var buildRev = function() {
	if (currentEnvironment.env === environmentOptions.envDev.env || currentEnvironment.env === environmentOptions.envQA.env) {
		var rev = '';
		var date = new Date();
		rev = `${date.getFullYear()}${date.getMonth()}${date.getDay()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
		return rev;
	} else {
		return version;
	}
};

var pushFiles = function() {
	log(`Pushing ${currentEnvironment.env} files to ${config.sharePoint}`);
	var child = execFile('sharepoint.map.bat', (error, stdout, stderr) => {// unmapped N drive to ensure drive is not mapped to anything
		var child = execFile('sharepoint.map.bat', [config.sharePoint], (error, stdout, stderr) => {// map N drive to sharePoint
			if (error) {
				throw error;
			}
			if (stdout) {
				//Push files to folder 
				//var src = [currentEnvironment.path + '**/*.*', '!' + currentEnvironment.path + 'archive{,/**}'];
				var src = `${currentEnvironment.path}`;
				var dest = `N:\\${currentEnvironment.appBaseFolder}`;
				var excludeEntryFiles = '';
				var cmd = '';
				log('Pushing files to server');

				config.apps.map((a) => {
					if (a.entryFile) {
						(excludeEntryFiles === '') ? excludeEntryFile = ` /XF ${a.entryFile}` : excludeEntryFiles += ` ${a.entryFile}`;
					}
				});

				cmd = `robocopy ${stripLeadingDotSlash(src)} ${dest} *.* /E /MIR /XD archive${excludeEntryFile}`;
				exec(cmd, (err, data) => {
					if(err){
						log(err);
					} 
					var t = 3000;
					setTimeout(() => {
						log('Finished pushing files');
						var child = execFile('sharepoint.map.bat', (error, stdout, stderr) => { }); //unmap N drive
					}, t);
					log(data);
					var appCount = 0;
					config.apps.map((a) => {
						var entryCmd = '';
						if (a.entryFile) {
							var entryCmd = `robocopy ${src}${a.appFolder} N:\\${a.entryPageFolder} ${a.entryFile} /E /MIR`;
							exec(entryCmd, (err, data) => {
								if (err){
									log(err);
								}
								log(data);
								t = 3000;
							});
						}
					});
				});




			}
		});
	});
};

var stripLeadingDotSlash = function(path) {
	var pathOut = path;
	if (path.substring(0, 2) == './') {
		pathOut = path.substring(2, path.length - 1);
	}
	return pathOut;
}

var pushFilesToRemote = function() {
	var canPush = false;
	var preVersion = version;
	if (args.major || args.minor || args.build) {
		log(`
		Pushing new version ${currentEnvironment.env}
		Archiving files
		`);

		archiveApp(() => {
			incrementVersion(args);
			log(`
			Increment version 
			Previous version ${preVersion}
			Version updated to ${version} 
			`);
			pushFiles();
		});
	} else if (args.current) {
		log(`
Pushing current version to ${currentEnvironment.env}
Archiving files`);
		archiveApp(() => {
			log(`

Previous version ${version}
Current version ${version}`);
			pushFiles();
		});
	} else {
		log(`
		Current version ${version}

		Please specify version information. 

		push usage:

		push-${currentEnvironment.env} valid arguments 

		gulp push-${currentEnvironment.env} --[major|minor|build|current]

		Incrementing version numbers before pushing to ${currentEnvironment.env}
		gulp push-${currentEnvironment.env} --major  
		gulp push-${currentEnvironment.env} --minor
		gulp push-${currentEnvironment.env} --build

		Push to ${currentEnvironment.env} with the current version number 
		gulp push-${currentEnvironment.env} --current

		`);
	}
};



var buildEnv = function(envOpts) {
	currentEnvironment = envOpts;

	if (currentEnvironment.env === environmentOptions.envDev.env && args.local === true) {
		currentEnvironment.buildType = 'local';
	}

	if ((currentEnvironment.env === environmentOptions.envDev.env && args.local !== true) || currentEnvironment.env === environmentOptions.envQA.env) {
		currentEnvironment.buildType = 'devqa';
	}

	if (currentEnvironment.env === environmentOptions.envStage || currentEnvironment.env === environmentOptions.envProd) {
		currentEnvironment.buildType = 'stageprod';
	}


};

var runServer = function(options) {
	if (args.serve) {
		connect.server({
			root: options.path,
			port: options.port,
			livereload: true
		});
	}
};

buildEnv(environmentOptions.envDev);

