sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zmmf005',
            componentId: 'ZI_MM_BSLR_INTERIMList',
            contextPath: '/ZI_MM_BSLR_INTERIM'
        },
        CustomPageDefinitions
    );
});