define( ['jquery',  'utils/CommonUtils'], function(jquery, CommonUtils){
	return  CommonUtils ={
		loadCssFiles: function(cssFiles, callback){
			$.each(cssFiles, function(idx, css){
				CommonUtils.includeCss(css);
			});
			setTimeout(function(){	
				callback();
			}, 500);
		},
		includeCss: function(cssFile) {
			var link = document.createElement("link");
			link.type = "text/css";
			link.rel = "stylesheet";
			link.href = cssFile;
			if ($('link[href$="' + cssFile + '"]').length === 0){
				document.getElementsByTagName("head")[0].appendChild(link);
			} 

		} ,

		loadJSONDataFromFile: function(fileName, callback) {
			$.getJSON (fileName, function(data){
				callback(data);
			});
		}, 
		
		setDataTitle: function(){
			var dataTitle  = '';
			if (window.dataKey) {
				dataTitle = window.dataKey;
			} else {
				var title = window.location.pathname.split("/");
				if (title){
					title = title.pop().split(".")[0];
					dataTitle = title;
				}
			}
			return dataTitle;
		},

		setDataPath: function(){
			var dataKey = '';
			if (window.dataKey) {
				var parts = window.location.href.split("/");
				parts.pop();
				parts = parts.join("/") + "/" + window.dataKey + '.aspx';
				dataKey = parts;
			} else {
				dataKey = window.location.href;
			}

			return dataKey;
		}
	};
});