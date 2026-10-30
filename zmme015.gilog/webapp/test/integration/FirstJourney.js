sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheLogList.iSeeThisPage();
            Then.onTheLogList.onTable().iCheckColumns(7, {"LogUUID":{"header":"UUID"},"Item":{"header":"Item"},"CreatedBy":{"header":"User Name"},"CreatedOn":{"header":"Date"},"CreatedAt":{"header":"Field of type TIMS"},"MessageType":{"header":"Message type"},"Message":{"header":"Message Text"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheLogList.onFilterBar().iExecuteSearch();
            
            Then.onTheLogList.onTable().iCheckRows();

            When.onTheLogList.onTable().iPressRow(0);
            Then.onTheLogObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});