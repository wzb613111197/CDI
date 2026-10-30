sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onThePRODUCTIONLABELFORMList.iSeeThisPage();

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onThePRODUCTIONLABELFORMList.onFilterBar().iExecuteSearch();
            
            Then.onThePRODUCTIONLABELFORMList.onTable().iCheckRows();

            When.onThePRODUCTIONLABELFORMList.onTable().iPressRow(0);
            Then.onThePRODUCTIONLABELFORMObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});