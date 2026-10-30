sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppe020',
            componentId: 'ZC_PP_CN_HDRObjectPage',
            contextPath: '/ZC_PP_CN_HDR'
        },
        CustomPageDefinitions
    );
});