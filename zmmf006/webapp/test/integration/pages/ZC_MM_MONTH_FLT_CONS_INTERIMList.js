sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zmmf006',
            componentId: 'ZC_MM_MONTH_FLT_CONS_INTERIMList',
            contextPath: '/ZC_MM_MONTH_FLT_CONS_INTERIM'
        },
        CustomPageDefinitions
    );
});