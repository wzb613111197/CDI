sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zewmi017',
            componentId: 'ZEWMSTOCKMOVEList',
            contextPath: '/ZEWMSTOCKMOVE'
        },
        CustomPageDefinitions
    );
});