sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zewme002/inbgr/test/integration/pages/ZC_EWM_INB_GRList",
	"com/cathaydining/zewme002/inbgr/test/integration/pages/ZC_EWM_INB_GRObjectPage"
], function (JourneyRunner, ZC_EWM_INB_GRList, ZC_EWM_INB_GRObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zewme002/inbgr') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_EWM_INB_GRList: ZC_EWM_INB_GRList,
			onTheZC_EWM_INB_GRObjectPage: ZC_EWM_INB_GRObjectPage
        },
        async: true
    });

    return runner;
});

