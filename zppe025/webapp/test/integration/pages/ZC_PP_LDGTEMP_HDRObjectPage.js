sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppe025',
            componentId: 'ZC_PP_LDGTEMP_HDRObjectPage',
            contextPath: '/ZC_PP_LDGTEMP_HDR'
        },
        CustomPageDefinitions
    );
});