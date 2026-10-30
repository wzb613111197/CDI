sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZEWMSTOCKMOVEList.iSeeThisPage();
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Huident");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Material");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Batch");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Delivery Quantity");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Delivery Quantity");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Delivery Quantity");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Storage Type");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Storage Bin");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Areacode");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Locationid");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Tanum");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Material Document");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Material Doc. Year");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Message type");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Message Text");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("User Name");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Current Date");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Time");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Changed On");
            Then.onTheZEWMSTOCKMOVEList.onFilterBar().iCheckFilterField("Changed On");
            Then.onTheZEWMSTOCKMOVEList.onTable().iCheckColumns(20, {"Huident":{"header":"Huident"},"Matnr":{"header":"Material"},"Charg":{"header":"Batch"},"StockSap":{"header":"Delivery Quantity"},"StockWms":{"header":"Delivery Quantity"},"StockDiff":{"header":"Delivery Quantity"},"Lgtyp":{"header":"Storage Type"},"Lgpla":{"header":"Storage Bin"},"Areacode":{"header":"Areacode"},"Locationid":{"header":"Locationid"},"Tanum":{"header":"Tanum"},"Mblnr":{"header":"Material Document"},"Mjahr":{"header":"Material Doc. Year"},"Msgtyp":{"header":"Message type"},"Msgtxt":{"header":"Message Text"},"Uname":{"header":"User Name"},"Erdat":{"header":"Current Date"},"Erzet":{"header":"Time"},"LocalLastChanged":{"header":"Changed On"},"LastChanged":{"header":"Changed On"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZEWMSTOCKMOVEList.onFilterBar().iExecuteSearch();
            
            Then.onTheZEWMSTOCKMOVEList.onTable().iCheckRows();

            When.onTheZEWMSTOCKMOVEList.onTable().iPressRow(0);
            Then.onTheZEWMSTOCKMOVEObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});