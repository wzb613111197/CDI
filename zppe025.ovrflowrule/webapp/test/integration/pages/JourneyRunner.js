sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppe025/ovrflowrule/test/integration/pages/ZC_PP_OVRFLOW_RULEList",
	"com/cathaydining/zppe025/ovrflowrule/test/integration/pages/ZC_PP_OVRFLOW_RULEObjectPage"
], function (JourneyRunner, ZC_PP_OVRFLOW_RULEList, ZC_PP_OVRFLOW_RULEObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppe025/ovrflowrule') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_PP_OVRFLOW_RULEList: ZC_PP_OVRFLOW_RULEList,
			onTheZC_PP_OVRFLOW_RULEObjectPage: ZC_PP_OVRFLOW_RULEObjectPage
        },
        async: true
    });

    return runner;
});

