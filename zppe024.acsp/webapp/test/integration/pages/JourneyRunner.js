sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppe024/acsp/test/integration/pages/ZC_PP_LDGDEF_ACSPList",
	"com/cathaydining/zppe024/acsp/test/integration/pages/ZC_PP_LDGDEF_ACSPObjectPage"
], function (JourneyRunner, ZC_PP_LDGDEF_ACSPList, ZC_PP_LDGDEF_ACSPObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppe024/acsp') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_PP_LDGDEF_ACSPList: ZC_PP_LDGDEF_ACSPList,
			onTheZC_PP_LDGDEF_ACSPObjectPage: ZC_PP_LDGDEF_ACSPObjectPage
        },
        async: true
    });

    return runner;
});

