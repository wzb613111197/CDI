sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zmmf004',
            componentId: 'ZC_MM_DUTIABLE_ITEM_INTERIMObjectPage',
            contextPath: '/ZC_MM_DUTIABLE_ITEM_INTERIM'
        },
        CustomPageDefinitions
    );
});