sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppf012/test/integration/pages/ZI_PP_DISH_LABEL_FORM_PRINTList",
	"com/cathaydining/zppf012/test/integration/pages/ZI_PP_DISH_LABEL_FORM_PRINTObjectPage"
], function (JourneyRunner, ZI_PP_DISH_LABEL_FORM_PRINTList, ZI_PP_DISH_LABEL_FORM_PRINTObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppf012') + '/test/flp.html#app-preview',
        pages: {
			onTheZI_PP_DISH_LABEL_FORM_PRINTList: ZI_PP_DISH_LABEL_FORM_PRINTList,
			onTheZI_PP_DISH_LABEL_FORM_PRINTObjectPage: ZI_PP_DISH_LABEL_FORM_PRINTObjectPage
        },
        async: true
    });

    return runner;
});

