sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onThemainList.iSeeThisPage();
            Then.onThemainList.onFilterBar().iCheckFilterField("Company Code");
            Then.onThemainList.onFilterBar().iCheckFilterField("Fiscal Year");
            Then.onThemainList.onFilterBar().iCheckFilterField("Account Document");
            Then.onThemainList.onFilterBar().iCheckFilterField("Posting Date");
            Then.onThemainList.onFilterBar().iCheckFilterField("Customer");
            Then.onThemainList.onTable().iCheckColumns(11, {"Bukrs":{"header":"Company Code"},"Gjahr":{"header":"Fiscal Year"},"Belnr":{"header":"Account Document"},"Budat":{"header":"Posting Date"},"Kunnr":{"header":"Customer"},"Bldat":{"header":"Invoice Date"},"Awref":{"header":"Reference Document"},"Racct":{"header":"Account Number"},"Sgtxt":{"header":"Text"},"Wsl":{"header":"Amnt in Trans. Crcy"},"Rwcur":{"header":"Transaction Currency"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onThemainList.onFilterBar().iExecuteSearch();
            
            Then.onThemainList.onTable().iCheckRows();

            When.onThemainList.onTable().iPressRow(0);
            Then.onThemainObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});