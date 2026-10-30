sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppe025/ovrflowmeltype/test/integration/pages/ZC_PP_OVRFLOW_MELTYPList",
	"com/cathaydining/zppe025/ovrflowmeltype/test/integration/pages/ZC_PP_OVRFLOW_MELTYPObjectPage"
], function (JourneyRunner, ZC_PP_OVRFLOW_MELTYPList, ZC_PP_OVRFLOW_MELTYPObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppe025/ovrflowmeltype') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_PP_OVRFLOW_MELTYPList: ZC_PP_OVRFLOW_MELTYPList,
			onTheZC_PP_OVRFLOW_MELTYPObjectPage: ZC_PP_OVRFLOW_MELTYPObjectPage
        },
        async: true
    });

    return runner;
});

