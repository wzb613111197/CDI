sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zmmf004',
            componentId: 'ZC_MM_DUTIABLE_ITEM_INTERIMList',
            contextPath: '/ZC_MM_DUTIABLE_ITEM_INTERIM'
        },
        CustomPageDefinitions
    );
});