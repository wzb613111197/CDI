sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zewmf009',
            componentId: 'ZI_EWM_INVENTORYList',
            contextPath: '/ZI_EWM_INVENTORY'
        },
        CustomPageDefinitions
    );
});