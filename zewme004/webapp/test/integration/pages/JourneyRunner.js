sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zewme004/test/integration/pages/ZC_EWM_RELOCDOCList",
	"com/cathaydining/zewme004/test/integration/pages/ZC_EWM_RELOCDOCObjectPage"
], function (JourneyRunner, ZC_EWM_RELOCDOCList, ZC_EWM_RELOCDOCObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zewme004') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_EWM_RELOCDOCList: ZC_EWM_RELOCDOCList,
			onTheZC_EWM_RELOCDOCObjectPage: ZC_EWM_RELOCDOCObjectPage
        },
        async: true
    });

    return runner;
});

