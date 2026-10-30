sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zmmf005',
            componentId: 'ZI_MM_BSLR_INTERIMObjectPage',
            contextPath: '/ZI_MM_BSLR_INTERIM'
        },
        CustomPageDefinitions
    );
});