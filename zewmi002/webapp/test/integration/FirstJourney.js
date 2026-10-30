sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_EWM_TASK_PICKList.iSeeThisPage();
            Then.onTheZC_EWM_TASK_PICKList.onFilterBar().iCheckFilterField("Mo");
            Then.onTheZC_EWM_TASK_PICKList.onFilterBar().iCheckFilterField("Source Hu");
            Then.onTheZC_EWM_TASK_PICKList.onFilterBar().iCheckFilterField("Material");
            Then.onTheZC_EWM_TASK_PICKList.onTable().iCheckColumns(30, {"Mo":{"header":"Mo"},"Moitem":{"header":"Moitem"},"Vlenr":{"header":"Source Hu"},"Matnr":{"header":"Material"},"Charg":{"header":"Batch"},"Menge":{"header":"Menge"},"Vltyp":{"header":"Source Storage Type"},"Vlpla":{"header":"Source Storage Bin"},"Nlenr":{"header":"Target Hu"},"Nlpla":{"header":"Target Storage Bin"},"Restqty":{"header":"Remaining Quantity"},"Qtydiff":{"header":"Quantity of Differences"},"Sign":{"header":"+/- Sign"},"DeboxReq":{"header":"Deboxing Requirement"},"DeboxConf":{"header":"Deboxing Confirmation"},"Vbeln":{"header":"Delivery"},"Posnr":{"header":"Item"},"Tanum":{"header":"Warehouse Task"},"TanumDiff":{"header":"Quantity Difference Warhouse Task"},"TanumPc":{"header":"Warehouse Task for Posting Change"},"Zmode":{"header":"Business Mode"},"Zwms":{"header":"WMS Data"},"Status":{"header":"Warehouse Task Status"},"Sendback":{"header":"Send Back Status"},"ZuserR":{"header":"Created By"},"ZdateR":{"header":"Created Date"},"ZtimeR":{"header":"Created Time"},"ZuserU":{"header":"Changed By"},"ZdateU":{"header":"Changed Date"},"ZtimeU":{"header":"Changed Time"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_EWM_TASK_PICKList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_EWM_TASK_PICKList.onTable().iCheckRows();

            When.onTheZC_EWM_TASK_PICKList.onTable().iPressRow(0);
            Then.onTheZC_EWM_TASK_PICKObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});