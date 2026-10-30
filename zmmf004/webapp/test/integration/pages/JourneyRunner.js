sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zmmf004/test/integration/pages/ZC_MM_DUTIABLE_ITEM_INTERIMList",
	"com/cathaydining/zmmf004/test/integration/pages/ZC_MM_DUTIABLE_ITEM_INTERIMObjectPage"
], function (JourneyRunner, ZC_MM_DUTIABLE_ITEM_INTERIMList, ZC_MM_DUTIABLE_ITEM_INTERIMObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zmmf004') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_MM_DUTIABLE_ITEM_INTERIMList: ZC_MM_DUTIABLE_ITEM_INTERIMList,
			onTheZC_MM_DUTIABLE_ITEM_INTERIMObjectPage: ZC_MM_DUTIABLE_ITEM_INTERIMObjectPage
        },
        async: true
    });

    return runner;
});

