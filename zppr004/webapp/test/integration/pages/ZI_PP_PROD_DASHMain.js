sap.ui.define(['sap/fe/test/TemplatePage'], function(TemplatePage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new TemplatePage(
        'com.cathaydining.zppr004::ZI_PP_PROD_DASHMain',
        CustomPageDefinitions
    );
});