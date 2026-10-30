sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zfif002/test/integration/pages/mainList",
	"com/cathaydining/zfif002/test/integration/pages/mainObjectPage"
], function (JourneyRunner, mainList, mainObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zfif002') + '/test/flp.html#app-preview',
        pages: {
			onThemainList: mainList,
			onThemainObjectPage: mainObjectPage
        },
        async: true
    });

    return runner;
});

