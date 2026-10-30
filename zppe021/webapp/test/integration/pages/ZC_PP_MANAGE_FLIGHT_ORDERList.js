sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppe021',
            componentId: 'ZC_PP_MANAGE_FLIGHT_ORDERList',
            contextPath: '/ZC_PP_MANAGE_FLIGHT_ORDER'
        },
        CustomPageDefinitions
    );
});