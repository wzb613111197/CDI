sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zsdr005/test/integration/pages/ZC_SD_STANDARD_BILLING_REPORTList",
	"com/cathaydining/zsdr005/test/integration/pages/ZC_SD_STANDARD_BILLING_REPORTObjectPage"
], function (JourneyRunner, ZC_SD_STANDARD_BILLING_REPORTList, ZC_SD_STANDARD_BILLING_REPORTObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zsdr005') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_SD_STANDARD_BILLING_REPORTList: ZC_SD_STANDARD_BILLING_REPORTList,
			onTheZC_SD_STANDARD_BILLING_REPORTObjectPage: ZC_SD_STANDARD_BILLING_REPORTObjectPage
        },
        async: true
    });

    return runner;
});

