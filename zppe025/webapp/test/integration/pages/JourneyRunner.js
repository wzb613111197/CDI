sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppe025/test/integration/pages/ZC_PP_LDGTEMP_HDRList",
	"com/cathaydining/zppe025/test/integration/pages/ZC_PP_LDGTEMP_HDRObjectPage"
], function (JourneyRunner, ZC_PP_LDGTEMP_HDRList, ZC_PP_LDGTEMP_HDRObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppe025') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_PP_LDGTEMP_HDRList: ZC_PP_LDGTEMP_HDRList,
			onTheZC_PP_LDGTEMP_HDRObjectPage: ZC_PP_LDGTEMP_HDRObjectPage
        },
        async: true
    });

    return runner;
});

