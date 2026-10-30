sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zmmf006/test/integration/pages/ZC_MM_MONTH_FLT_CONS_INTERIMList",
	"com/cathaydining/zmmf006/test/integration/pages/ZC_MM_MONTH_FLT_CONS_INTERIMObjectPage"
], function (JourneyRunner, ZC_MM_MONTH_FLT_CONS_INTERIMList, ZC_MM_MONTH_FLT_CONS_INTERIMObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zmmf006') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_MM_MONTH_FLT_CONS_INTERIMList: ZC_MM_MONTH_FLT_CONS_INTERIMList,
			onTheZC_MM_MONTH_FLT_CONS_INTERIMObjectPage: ZC_MM_MONTH_FLT_CONS_INTERIMObjectPage
        },
        async: true
    });

    return runner;
});

