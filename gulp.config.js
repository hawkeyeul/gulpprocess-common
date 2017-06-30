module.exports = function() {
	var source = './src/';
	var config = {
		sharePoint: '\\\\portal.kiewit.com@ssl\\DavWWWroot\\sites\\test_kiewitpower_development\\',
		apps: [
			{
				appName: 'remoteaccess',
				appFolder: 'remoteaccess/',
				appHTML: source + 'RemoteAccess/*.html',
				entryFile: 'remoteaccess.aspx',
				entryPageFolder: 'playground\\remoteaccess\\', //base path to location where entry aspx file will be stored 
				appJs: [
					source + 'RemoteAccess/**/*.js'
				],
				extAppJs: [
					{ src: source +  '/Common/scripts/**/*.js', appName: 'common' }
				]
			},
			{
				appName: 'common',
				appHTML: source + 'Common/*.html',
				appFolder: 'common/',
				cssName: 'common.css',
				appViews: [
					source + 'Common/views/**/*.html'
				],
				appJs: [
					source + 'Common/scripts/**/*.js'
				],
				appCSS: [
					source + 'Common/styles/**/*.css'
				],
				appLESS: [
					source + 'Common/styles/**/*.less'
				],
				appSCSS: [
					source + 'Common/styles/**/*.scss'
				],
				images: [
					source + 'Common/images/**/*'
				]
			}
		],


		environmentOptions: {
			envDev: {
				path: './build/dev/',
				port: 7201,
				env: 'dev',
				extJSPaths: [
					'/sites/test_kiewitpower_development/CustomApps/Lib/jquery1.11.3/jquery-1.11.3.min.js',
					'/sites/test_kiewitpower_development/CustomApps/Lib/RequireJS/require.2.3.1.min.js'
				],
				extCSSPaths: [
				],
				appBaseFolder: 'customApps\\Common\\', //base path to location where js, css, image files will stored here
				buildFolder: 'build/dev', //used to remove build path when injecting files
				buildType: 'devqa', //do not change

			},
			envQA: {
				path: './build/qa/',
				port: 7202,
				env: 'qa',
				extJSPaths: [
					'/sites/test_kiewitpower_development/CustomApps/Lib/jquery1.11.3/jquery-1.11.3.min.js',
					'/sites/test_kiewitpower_development/CustomApps/Lib/RequireJS/require.2.3.1.min.js',
					'/sites/test_kiewitpower_development/CustomApps/Lib/SPServices2014.02/jquery.SPServices-2014.02.min.js',
					'/sites/test_kiewitpower_development/CustomApps/Utils/quoteme.js',
					'/sites/test_kiewitpower_development/CustomApps/Utils/SPSDataUtils.js'
				],
				extCSSPaths: [

				],
				serverFolder: '\\portal.kiewit.com@SSL\sites\customApps\\test\\', //network path needs to be escaped 
				buildFolder: 'build/qa', //used to remove build path when injecting files
				buildType: 'devqa', //do not change
			},
			envStage: {
				path: './build/stage/',
				port: 7203,
				env: 'stage',
				extJSPaths: [

				],
				extCSSPaths: [
				],
				serverFolder: '',
				buildFolder: 'build/stage', //used to remove build path when injecting files
				buildType: 'stageprod', //do not change
			},
			envProd: {
				path: './build/prod/',
				port: 7204,
				env: 'prod',
				extJSPaths: [
				],
				extCSSPaths: [
				],
				serverFolder: '',
				buildFolder: 'build/prod', //used to remove build path when injecting files
				buildType: 'stageprod', //do not change
			}
		},
		source: source,
		versionFile: './version.json'
	};

	return config;
};