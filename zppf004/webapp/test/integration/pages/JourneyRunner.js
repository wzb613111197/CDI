sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppf004/test/integration/pages/CrewInfoList",
	"com/cathaydining/zppf004/test/integration/pages/CrewInfoObjectPage"
], function (JourneyRunner, CrewInfoList, CrewInfoObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppf004') + '/test/flp.html#app-preview',
        pages: {
			onTheCrewInfoList: CrewInfoList,
			onTheCrewInfoObjectPage: CrewInfoObjectPage
        },
        async: true
    });

    return runner;
});

