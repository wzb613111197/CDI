sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppf010/test/integration/pages/zc_pp_top_up_labelList",
	"com/cathaydining/zppf010/test/integration/pages/zc_pp_top_up_labelObjectPage"
], function (JourneyRunner, zc_pp_top_up_labelList, zc_pp_top_up_labelObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppf010') + '/test/flp.html#app-preview',
        pages: {
			onThezc_pp_top_up_labelList: zc_pp_top_up_labelList,
			onThezc_pp_top_up_labelObjectPage: zc_pp_top_up_labelObjectPage
        },
        async: true
    });

    return runner;
});

