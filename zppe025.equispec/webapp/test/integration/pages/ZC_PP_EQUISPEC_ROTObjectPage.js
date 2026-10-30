sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppe025.equispec',
            componentId: 'ZC_PP_EQUISPEC_ROTObjectPage',
            contextPath: '/ZC_PP_EQUISPEC_ROT'
        },
        CustomPageDefinitions
    );
});