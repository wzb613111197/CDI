sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zfii002/test/integration/pages/HeadList",
	"com/cathaydining/zfii002/test/integration/pages/HeadObjectPage",
	"com/cathaydining/zfii002/test/integration/pages/ItemObjectPage"
], function (JourneyRunner, HeadList, HeadObjectPage, ItemObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zfii002') + '/test/flp.html#app-preview',
        pages: {
			onTheHeadList: HeadList,
			onTheHeadObjectPage: HeadObjectPage,
			onTheItemObjectPage: ItemObjectPage
        },
        async: true
    });

    return runner;
});

