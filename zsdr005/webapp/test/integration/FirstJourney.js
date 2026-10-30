sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_SD_STANDARD_BILLING_REPORTList.iSeeThisPage();
            Then.onTheZC_SD_STANDARD_BILLING_REPORTList.onFilterBar().iCheckFilterField("Billing Document Number");
            Then.onTheZC_SD_STANDARD_BILLING_REPORTList.onTable().iCheckColumns(8, {"BillingDocumentNumber":{"header":"Billing Document Number"},"Payer":{"header":"Payer"},"AirlineCode":{"header":"Airline Code"},"BillingDate":{"header":"Billing Date"},"AircraftType":{"header":"Aircraft Type"},"NetValue":{"header":"Net Value"},"Message":{"header":"Message"},"SDDocumentCurrency":{"header":"Document Currency"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_SD_STANDARD_BILLING_REPORTList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_SD_STANDARD_BILLING_REPORTList.onTable().iCheckRows();

            When.onTheZC_SD_STANDARD_BILLING_REPORTList.onTable().iPressRow(0);
            Then.onTheZC_SD_STANDARD_BILLING_REPORTObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});