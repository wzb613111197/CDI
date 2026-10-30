sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppe025/equispec/test/integration/pages/ZC_PP_EQUISPEC_ROTList",
	"com/cathaydining/zppe025/equispec/test/integration/pages/ZC_PP_EQUISPEC_ROTObjectPage"
], function (JourneyRunner, ZC_PP_EQUISPEC_ROTList, ZC_PP_EQUISPEC_ROTObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppe025/equispec') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_PP_EQUISPEC_ROTList: ZC_PP_EQUISPEC_ROTList,
			onTheZC_PP_EQUISPEC_ROTObjectPage: ZC_PP_EQUISPEC_ROTObjectPage
        },
        async: true
    });

    return runner;
});

