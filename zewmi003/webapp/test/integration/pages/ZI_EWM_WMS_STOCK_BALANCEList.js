sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zewmi003',
            componentId: 'ZI_EWM_WMS_STOCK_BALANCEList',
            contextPath: '/ZI_EWM_WMS_STOCK_BALANCE'
        },
        CustomPageDefinitions
    );
});