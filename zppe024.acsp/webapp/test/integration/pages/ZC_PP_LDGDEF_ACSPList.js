sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppe024.acsp',
            componentId: 'ZC_PP_LDGDEF_ACSPList',
            contextPath: '/ZC_PP_LDGDEF_ACSP'
        },
        CustomPageDefinitions
    );
});