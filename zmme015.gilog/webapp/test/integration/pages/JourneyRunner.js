sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zmme015/gilog/test/integration/pages/LogList",
	"com/cathaydining/zmme015/gilog/test/integration/pages/LogObjectPage"
], function (JourneyRunner, LogList, LogObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zmme015/gilog') + '/test/flp.html#app-preview',
        pages: {
			onTheLogList: LogList,
			onTheLogObjectPage: LogObjectPage
        },
        async: true
    });

    return runner;
});

