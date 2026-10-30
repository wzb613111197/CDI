sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppe020/test/integration/pages/ZC_PP_CN_HDRList",
	"com/cathaydining/zppe020/test/integration/pages/ZC_PP_CN_HDRObjectPage"
], function (JourneyRunner, ZC_PP_CN_HDRList, ZC_PP_CN_HDRObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppe020') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_PP_CN_HDRList: ZC_PP_CN_HDRList,
			onTheZC_PP_CN_HDRObjectPage: ZC_PP_CN_HDRObjectPage
        },
        async: true
    });

    return runner;
});

