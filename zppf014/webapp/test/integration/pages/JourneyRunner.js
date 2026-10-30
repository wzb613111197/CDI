sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppf014/test/integration/pages/MANAGESHOPFLOORLABELList",
	"com/cathaydining/zppf014/test/integration/pages/MANAGESHOPFLOORLABELObjectPage"
], function (JourneyRunner, MANAGESHOPFLOORLABELList, MANAGESHOPFLOORLABELObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppf014') + '/test/flp.html#app-preview',
        pages: {
			onTheMANAGESHOPFLOORLABELList: MANAGESHOPFLOORLABELList,
			onTheMANAGESHOPFLOORLABELObjectPage: MANAGESHOPFLOORLABELObjectPage
        },
        async: true
    });

    return runner;
});

