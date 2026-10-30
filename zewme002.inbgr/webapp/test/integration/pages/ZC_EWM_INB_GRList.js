sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zewme002.inbgr',
            componentId: 'ZC_EWM_INB_GRList',
            contextPath: '/ZC_EWM_INB_GR'
        },
        CustomPageDefinitions
    );
});