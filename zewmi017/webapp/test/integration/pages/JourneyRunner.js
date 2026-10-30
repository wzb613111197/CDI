sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zewmi017/test/integration/pages/ZEWMSTOCKMOVEList",
	"com/cathaydining/zewmi017/test/integration/pages/ZEWMSTOCKMOVEObjectPage"
], function (JourneyRunner, ZEWMSTOCKMOVEList, ZEWMSTOCKMOVEObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zewmi017') + '/test/flp.html#app-preview',
        pages: {
			onTheZEWMSTOCKMOVEList: ZEWMSTOCKMOVEList,
			onTheZEWMSTOCKMOVEObjectPage: ZEWMSTOCKMOVEObjectPage
        },
        async: true
    });

    return runner;
});

