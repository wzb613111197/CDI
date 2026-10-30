sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppe024.catsecdet',
            componentId: 'ZC_PP_CAT_SEC_DETObjectPage',
            contextPath: '/ZC_PP_CAT_SEC_DET'
        },
        CustomPageDefinitions
    );
});