sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zmmf005/test/integration/pages/ZI_MM_BSLR_INTERIMList",
	"com/cathaydining/zmmf005/test/integration/pages/ZI_MM_BSLR_INTERIMObjectPage"
], function (JourneyRunner, ZI_MM_BSLR_INTERIMList, ZI_MM_BSLR_INTERIMObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zmmf005') + '/test/flp.html#app-preview',
        pages: {
			onTheZI_MM_BSLR_INTERIMList: ZI_MM_BSLR_INTERIMList,
			onTheZI_MM_BSLR_INTERIMObjectPage: ZI_MM_BSLR_INTERIMObjectPage
        },
        async: true
    });

    return runner;
});

