sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zewmi002',
            componentId: 'ZC_EWM_TASK_PICKList',
            contextPath: '/ZC_EWM_TASK_PICK'
        },
        CustomPageDefinitions
    );
});