sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zsde005/createquo/test/integration/pages/ZI_SD_QT_MATERIALList",
	"com/cathaydining/zsde005/createquo/test/integration/pages/ZI_SD_QT_MATERIALObjectPage"
], function (JourneyRunner, ZI_SD_QT_MATERIALList, ZI_SD_QT_MATERIALObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zsde005/createquo') + '/test/flp.html#app-preview',
        pages: {
			onTheZI_SD_QT_MATERIALList: ZI_SD_QT_MATERIALList,
			onTheZI_SD_QT_MATERIALObjectPage: ZI_SD_QT_MATERIALObjectPage
        },
        async: true
    });

    return runner;
});

