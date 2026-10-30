sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppe021/test/integration/pages/ZC_PP_MANAGE_FLIGHT_ORDERList",
	"com/cathaydining/zppe021/test/integration/pages/ZC_PP_MANAGE_FLIGHT_ORDERObjectPage"
], function (JourneyRunner, ZC_PP_MANAGE_FLIGHT_ORDERList, ZC_PP_MANAGE_FLIGHT_ORDERObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppe021') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_PP_MANAGE_FLIGHT_ORDERList: ZC_PP_MANAGE_FLIGHT_ORDERList,
			onTheZC_PP_MANAGE_FLIGHT_ORDERObjectPage: ZC_PP_MANAGE_FLIGHT_ORDERObjectPage
        },
        async: true
    });

    return runner;
});

