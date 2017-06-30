define( ['lib/SPServices2014.02/jquery.SPServices-2014.02.min'], function(SPServices){
	return SPSDataUtils = {
		SPSGetListItems:  function(params, callback) {
			var spsData;
			var webUrl = {
				dev: 'https://portal.kiewit.com/sites/test_kiewitpower_development/playground/',
				test: '',
				prod: '' 
			};


			$().SPServices({
				operation: "GetListItems",
				async: false,
				webURL: webUrl[(window.env)? window.env : 'dev'],
				listName: params.listname,
				CAMLQuery: params.query,
				CAMLViewFields: params.viewFields,
				CAMLQueryOptions: params.queryOptions,
				completefunc: function(xData, Status) {
					callback($(xData.responseXML).SPFilterNode('z:row').SPXmlToJson({ includeAllAttrs: true, removeOws: true }));
				}
			});

		},
		SPSUpdateListItem:  function(params) {
			var spsData = false;
			var webUrl = {
				dev: 'https://portal.kiewit.com/sites/test_kiewitpower_development/playground/',
				test: '',
				prod: '' 
			};


			$().SPServices({
				operation: "UpdateListItems",
				async: false,
				batchCmd: params.cmd,
				webURL: webUrl[(window.env)? window.env : 'dev'],
				listName: params.listName,
				valuepairs: params.valuepairs,
				ID: params.id,
				completefunc:function(xData, Status) {
					var status = {
						errorCode : $(xData.responseXML).SPFilterNode('ErrorCode').text(),
						errorText : $(xData.responseXML).SPFilterNode('ErrorText').text(),
						status: Status
					};
					if(status.status === "success" && status.errorCode === "0x00000000") {
						if(params.toastr && typeof toastr === 'object')
							toastr.success(params.toastr, 'Successfully saved');
						spsData = $(xData.responseXML).SPFilterNode("z:row").SPXmlToJson({ includeAllAttrs: true, removeOws: true });
					} else {

						//vm.error(new vm.Error(status));
					}
				}
			});
			return spsData;
		}
	};
});