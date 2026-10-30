sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zewmi003/test/integration/pages/ZI_EWM_WMS_STOCK_BALANCEList",
	"com/cathaydining/zewmi003/test/integration/pages/ZI_EWM_WMS_STOCK_BALANCEObjectPage"
], function (JourneyRunner, ZI_EWM_WMS_STOCK_BALANCEList, ZI_EWM_WMS_STOCK_BALANCEObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zewmi003') + '/test/flp.html#app-preview',
        pages: {
			onTheZI_EWM_WMS_STOCK_BALANCEList: ZI_EWM_WMS_STOCK_BALANCEList,
			onTheZI_EWM_WMS_STOCK_BALANCEObjectPage: ZI_EWM_WMS_STOCK_BALANCEObjectPage
        },
        async: true
    });

    return runner;
});

