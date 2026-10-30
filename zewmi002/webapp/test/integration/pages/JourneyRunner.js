sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zewmi002/test/integration/pages/ZC_EWM_TASK_PICKList",
	"com/cathaydining/zewmi002/test/integration/pages/ZC_EWM_TASK_PICKObjectPage"
], function (JourneyRunner, ZC_EWM_TASK_PICKList, ZC_EWM_TASK_PICKObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zewmi002') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_EWM_TASK_PICKList: ZC_EWM_TASK_PICKList,
			onTheZC_EWM_TASK_PICKObjectPage: ZC_EWM_TASK_PICKObjectPage
        },
        async: true
    });

    return runner;
});

