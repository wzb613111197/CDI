sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppe024/test/integration/pages/ZC_PP_LDGDEF_HDRList",
	"com/cathaydining/zppe024/test/integration/pages/ZC_PP_LDGDEF_HDRObjectPage"
], function (JourneyRunner, ZC_PP_LDGDEF_HDRList, ZC_PP_LDGDEF_HDRObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppe024') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_PP_LDGDEF_HDRList: ZC_PP_LDGDEF_HDRList,
			onTheZC_PP_LDGDEF_HDRObjectPage: ZC_PP_LDGDEF_HDRObjectPage
        },
        async: true
    });

    return runner;
});

