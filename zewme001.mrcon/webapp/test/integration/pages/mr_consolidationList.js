sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zewme001.mrcon',
            componentId: 'mr_consolidationList',
            contextPath: '/mr_consolidation'
        },
        CustomPageDefinitions
    );
});