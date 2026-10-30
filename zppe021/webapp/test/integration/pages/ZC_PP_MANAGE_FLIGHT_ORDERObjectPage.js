sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppe021',
            componentId: 'ZC_PP_MANAGE_FLIGHT_ORDERObjectPage',
            contextPath: '/ZC_PP_MANAGE_FLIGHT_ORDER'
        },
        CustomPageDefinitions
    );
});