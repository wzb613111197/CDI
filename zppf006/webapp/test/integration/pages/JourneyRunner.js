sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppf006/test/integration/pages/ZC_PP_FLIGHT_LABELList",
	"com/cathaydining/zppf006/test/integration/pages/ZC_PP_FLIGHT_LABELObjectPage"
], function (JourneyRunner, ZC_PP_FLIGHT_LABELList, ZC_PP_FLIGHT_LABELObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppf006') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_PP_FLIGHT_LABELList: ZC_PP_FLIGHT_LABELList,
			onTheZC_PP_FLIGHT_LABELObjectPage: ZC_PP_FLIGHT_LABELObjectPage
        },
        async: true
    });

    return runner;
});

