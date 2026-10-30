sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zcoe001/download/test/integration/pages/MainList",
	"com/cathaydining/zcoe001/download/test/integration/pages/MainObjectPage"
], function (JourneyRunner, MainList, MainObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zcoe001/download') + '/test/flp.html#app-preview',
        pages: {
			onTheMainList: MainList,
			onTheMainObjectPage: MainObjectPage
        },
        async: true
    });

    return runner;
});

