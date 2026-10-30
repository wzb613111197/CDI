sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppe024/catsecdet/test/integration/pages/ZC_PP_CAT_SEC_DETList",
	"com/cathaydining/zppe024/catsecdet/test/integration/pages/ZC_PP_CAT_SEC_DETObjectPage"
], function (JourneyRunner, ZC_PP_CAT_SEC_DETList, ZC_PP_CAT_SEC_DETObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppe024/catsecdet') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_PP_CAT_SEC_DETList: ZC_PP_CAT_SEC_DETList,
			onTheZC_PP_CAT_SEC_DETObjectPage: ZC_PP_CAT_SEC_DETObjectPage
        },
        async: true
    });

    return runner;
});

