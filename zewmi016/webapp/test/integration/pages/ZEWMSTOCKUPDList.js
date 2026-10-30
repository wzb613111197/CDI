sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zewmi016',
            componentId: 'ZEWMSTOCKUPDList',
            contextPath: '/ZEWMSTOCKUPD'
        },
        CustomPageDefinitions
    );
});