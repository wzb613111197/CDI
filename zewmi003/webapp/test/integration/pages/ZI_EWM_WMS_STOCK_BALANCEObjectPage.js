sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zewmi003',
            componentId: 'ZI_EWM_WMS_STOCK_BALANCEObjectPage',
            contextPath: '/ZI_EWM_WMS_STOCK_BALANCE'
        },
        CustomPageDefinitions
    );
});