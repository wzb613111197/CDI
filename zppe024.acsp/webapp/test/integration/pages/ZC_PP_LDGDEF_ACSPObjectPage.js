sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppe024.acsp',
            componentId: 'ZC_PP_LDGDEF_ACSPObjectPage',
            contextPath: '/ZC_PP_LDGDEF_ACSP'
        },
        CustomPageDefinitions
    );
});