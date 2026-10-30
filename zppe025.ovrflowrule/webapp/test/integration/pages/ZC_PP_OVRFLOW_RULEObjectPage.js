sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppe025.ovrflowrule',
            componentId: 'ZC_PP_OVRFLOW_RULEObjectPage',
            contextPath: '/ZC_PP_OVRFLOW_RULE'
        },
        CustomPageDefinitions
    );
});