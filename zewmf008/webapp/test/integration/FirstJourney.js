sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZI_EWM_BOND_STOCK_LEDGER_RPTList.iSeeThisPage();
            Then.onTheZI_EWM_BOND_STOCK_LEDGER_RPTList.onFilterBar().iCheckFilterField("Dutiable/Non-dutiable");
            Then.onTheZI_EWM_BOND_STOCK_LEDGER_RPTList.onFilterBar().iCheckFilterField("Airline");
            Then.onTheZI_EWM_BOND_STOCK_LEDGER_RPTList.onFilterBar().iCheckFilterField("Area");
            Then.onTheZI_EWM_BOND_STOCK_LEDGER_RPTList.onFilterBar().iCheckFilterField("Key Date");
            Then.onTheZI_EWM_BOND_STOCK_LEDGER_RPTList.onTable().iCheckColumns(11, {"ItemCode":{"header":"Item Code"},"Description":{"header":"Description"},"CustomCode":{"header":"Custom Code"},"Unit":{"header":"Unit"},"UnitofMeasure":{"header":"Unit of Measure"},"DutyStatus":{"header":"Dutiable/Non-dutiable"},"Airline":{"header":"Airline"},"Area":{"header":"Area"},"KeyDate":{"header":"Key Date"},"KeyDateEnd":{"header":"KeyDateEnd"},"AIRLINETEXT":{"header":"Characteristic Value"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZI_EWM_BOND_STOCK_LEDGER_RPTList.onFilterBar().iExecuteSearch();
            
            Then.onTheZI_EWM_BOND_STOCK_LEDGER_RPTList.onTable().iCheckRows();

            When.onTheZI_EWM_BOND_STOCK_LEDGER_RPTList.onTable().iPressRow(0);
            Then.onTheZI_EWM_BOND_STOCK_LEDGER_RPTObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});