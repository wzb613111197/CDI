sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZEWMSTOCKUPDList.iSeeThisPage();
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("Huident");
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("Material");
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("Batch");
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("Quantity");
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("Storage Type");
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("Storage Bin");
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("Business Mode");
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("MO Number");
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("Tanum");
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("User Name");
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("Current Date");
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("Time");
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("Message type");
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("Changed On");
            Then.onTheZEWMSTOCKUPDList.onFilterBar().iCheckFilterField("Changed On");
            Then.onTheZEWMSTOCKUPDList.onTable().iCheckColumns(18, {"Huident":{"header":"Huident"},"Matnr":{"header":"Material"},"Charg":{"header":"Batch"},"Menge":{"header":"Quantity"},"Zlock":{"header":"Zlock"},"Lgtyp":{"header":"Storage Type"},"Lgpla":{"header":"Storage Bin"},"Zmode":{"header":"Business Mode"},"Mo":{"header":"MO Number"},"Samebin":{"header":"Samebin"},"Tanum":{"header":"Tanum"},"Zuser":{"header":"User Name"},"Zdate":{"header":"Current Date"},"Ztime":{"header":"Time"},"Msgtyp":{"header":"Message type"},"Msgtxt":{"header":"Message Text"},"LocalLastChanged":{"header":"Changed On"},"LastChanged":{"header":"Changed On"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZEWMSTOCKUPDList.onFilterBar().iExecuteSearch();
            
            Then.onTheZEWMSTOCKUPDList.onTable().iCheckRows();

            When.onTheZEWMSTOCKUPDList.onTable().iPressRow(0);
            Then.onTheZEWMSTOCKUPDObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});