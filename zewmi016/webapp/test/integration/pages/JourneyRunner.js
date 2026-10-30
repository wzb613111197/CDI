sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zewmi016/test/integration/pages/ZEWMSTOCKUPDList",
	"com/cathaydining/zewmi016/test/integration/pages/ZEWMSTOCKUPDObjectPage"
], function (JourneyRunner, ZEWMSTOCKUPDList, ZEWMSTOCKUPDObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zewmi016') + '/test/flp.html#app-preview',
        pages: {
			onTheZEWMSTOCKUPDList: ZEWMSTOCKUPDList,
			onTheZEWMSTOCKUPDObjectPage: ZEWMSTOCKUPDObjectPage
        },
        async: true
    });

    return runner;
});

