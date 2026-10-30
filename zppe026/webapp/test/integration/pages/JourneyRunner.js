sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppe026/test/integration/pages/ZC_PP_LDGRMP_HDRList",
	"com/cathaydining/zppe026/test/integration/pages/ZC_PP_LDGRMP_HDRObjectPage"
], function (JourneyRunner, ZC_PP_LDGRMP_HDRList, ZC_PP_LDGRMP_HDRObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppe026') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_PP_LDGRMP_HDRList: ZC_PP_LDGRMP_HDRList,
			onTheZC_PP_LDGRMP_HDRObjectPage: ZC_PP_LDGRMP_HDRObjectPage
        },
        async: true
    });

    return runner;
});

