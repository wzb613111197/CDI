sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppf006',
            componentId: 'ZC_PP_FLIGHT_LABELList',
            contextPath: '/ZC_PP_FLIGHT_LABEL'
        },
        CustomPageDefinitions
    );
});