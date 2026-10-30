sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppe024',
            componentId: 'ZC_PP_LDGDEF_HDRObjectPage',
            contextPath: '/ZC_PP_LDGDEF_HDR'
        },
        CustomPageDefinitions
    );
});