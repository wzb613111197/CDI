sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppe025.ovrflowmeltype',
            componentId: 'ZC_PP_OVRFLOW_MELTYPObjectPage',
            contextPath: '/ZC_PP_OVRFLOW_MELTYP'
        },
        CustomPageDefinitions
    );
});