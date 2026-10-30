sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zsde005/changequo/test/integration/pages/ZC_SD_QUERY_QT_HEADList",
	"com/cathaydining/zsde005/changequo/test/integration/pages/ZC_SD_QUERY_QT_HEADObjectPage"
], function (JourneyRunner, ZC_SD_QUERY_QT_HEADList, ZC_SD_QUERY_QT_HEADObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zsde005/changequo') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_SD_QUERY_QT_HEADList: ZC_SD_QUERY_QT_HEADList,
			onTheZC_SD_QUERY_QT_HEADObjectPage: ZC_SD_QUERY_QT_HEADObjectPage
        },
        async: true
    });

    return runner;
});

