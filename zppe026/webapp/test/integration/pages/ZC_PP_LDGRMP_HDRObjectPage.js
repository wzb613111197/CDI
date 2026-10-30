sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppe026',
            componentId: 'ZC_PP_LDGRMP_HDRObjectPage',
            contextPath: '/ZC_PP_LDGRMP_HDR'
        },
        CustomPageDefinitions
    );
});