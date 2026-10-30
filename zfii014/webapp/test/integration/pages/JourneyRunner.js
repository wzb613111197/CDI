sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zfii014/test/integration/pages/MainList",
	"com/cathaydining/zfii014/test/integration/pages/MainObjectPage"
], function (JourneyRunner, MainList, MainObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zfii014') + '/test/flp.html#app-preview',
        pages: {
			onTheMainList: MainList,
			onTheMainObjectPage: MainObjectPage
        },
        async: true
    });

    return runner;
});

