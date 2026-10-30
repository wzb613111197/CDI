sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheMainList.iSeeThisPage();
            Then.onTheMainList.onFilterBar().iCheckFilterField("Material");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Plant");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Storage Location");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Batch");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Material Type");
            Then.onTheMainList.onTable().iCheckColumns(10, {"Material":{"header":"Material"},"Plant":{"header":"Plant"},"StorageLocation":{"header":"Storage Location"},"charg":{"header":"Batch"},"MaterialType":{"header":"Material Type"},"UnrestrictedQty":{"header":"Unrestricted-Use Stock"},"BaseUnit":{"header":"Base Unit of Measure"},"CostCenter":{"header":"Cost Center"},"Status":{"header":"Status"},"Message":{"header":"Message"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheMainList.onFilterBar().iExecuteSearch();
            
            Then.onTheMainList.onTable().iCheckRows();

            When.onTheMainList.onTable().iPressRow(0);
            Then.onTheMainObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});