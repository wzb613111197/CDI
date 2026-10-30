sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zfiw001/test/integration/pages/ZC_FI_APPR_HDRList",
	"com/cathaydining/zfiw001/test/integration/pages/ZC_FI_APPR_HDRObjectPage"
], function (JourneyRunner, ZC_FI_APPR_HDRList, ZC_FI_APPR_HDRObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zfiw001') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_FI_APPR_HDRList: ZC_FI_APPR_HDRList,
			onTheZC_FI_APPR_HDRObjectPage: ZC_FI_APPR_HDRObjectPage
        },
        async: true
    });

    return runner;
});

