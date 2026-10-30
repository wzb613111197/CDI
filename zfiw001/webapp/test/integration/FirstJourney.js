sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_FI_APPR_HDRList.iSeeThisPage();
            Then.onTheZC_FI_APPR_HDRList.onFilterBar().iCheckFilterField("ApprGroup");
            Then.onTheZC_FI_APPR_HDRList.onFilterBar().iCheckFilterField("ApprName");
            Then.onTheZC_FI_APPR_HDRList.onFilterBar().iCheckFilterField("Active");
            Then.onTheZC_FI_APPR_HDRList.onTable().iCheckColumns(6, {"ApprGroup":{"header":"ApprGroup"},"ApprName":{"header":"ApprName"},"ApprLevel":{"header":"ApprLevel"},"AmountFrom":{"header":"AmountFrom"},"AmountTo":{"header":"AmountTo"},"Active":{"header":"Active"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_FI_APPR_HDRList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_FI_APPR_HDRList.onTable().iCheckRows();

            When.onTheZC_FI_APPR_HDRList.onTable().iPressRow(0);
            Then.onTheZC_FI_APPR_HDRObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});