sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zmme015/gi/test/integration/pages/MainList",
	"com/cathaydining/zmme015/gi/test/integration/pages/MainObjectPage"
], function (JourneyRunner, MainList, MainObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zmme015/gi') + '/test/flp.html#app-preview',
        pages: {
			onTheMainList: MainList,
			onTheMainObjectPage: MainObjectPage
        },
        async: true
    });

    return runner;
});

