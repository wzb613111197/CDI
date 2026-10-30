sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppf006',
            componentId: 'ZC_PP_FLIGHT_LABELObjectPage',
            contextPath: '/ZC_PP_FLIGHT_LABEL'
        },
        CustomPageDefinitions
    );
});