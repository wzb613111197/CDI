sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppf010',
            componentId: 'zc_pp_top_up_labelObjectPage',
            contextPath: '/zc_pp_top_up_label'
        },
        CustomPageDefinitions
    );
});