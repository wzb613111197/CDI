sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppf010',
            componentId: 'zc_pp_top_up_labelList',
            contextPath: '/zc_pp_top_up_label'
        },
        CustomPageDefinitions
    );
});