sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppr004/test/integration/pages/ZI_PP_PROD_DASHMain"
], function (JourneyRunner, ZI_PP_PROD_DASHMain) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppr004') + '/test/flp.html#app-preview',
        pages: {
			onTheZI_PP_PROD_DASHMain: ZI_PP_PROD_DASHMain
        },
        async: true
    });

    return runner;
});

