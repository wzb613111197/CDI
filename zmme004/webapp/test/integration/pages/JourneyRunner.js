sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zmme004/test/integration/pages/ZC_MM_REBOUNDList",
	"com/cathaydining/zmme004/test/integration/pages/ZC_MM_REBOUNDObjectPage"
], function (JourneyRunner, ZC_MM_REBOUNDList, ZC_MM_REBOUNDObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zmme004') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_MM_REBOUNDList: ZC_MM_REBOUNDList,
			onTheZC_MM_REBOUNDObjectPage: ZC_MM_REBOUNDObjectPage
        },
        async: true
    });

    return runner;
});

