sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zmmf006',
            componentId: 'ZC_MM_MONTH_FLT_CONS_INTERIMObjectPage',
            contextPath: '/ZC_MM_MONTH_FLT_CONS_INTERIM'
        },
        CustomPageDefinitions
    );
});