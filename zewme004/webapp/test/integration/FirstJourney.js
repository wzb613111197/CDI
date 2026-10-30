sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_EWM_RELOCDOCList.iSeeThisPage();
            Then.onTheZC_EWM_RELOCDOCList.onTable().iCheckColumns(9, {"SourceStorageType":{"header":"Storage Type"},"Plant":{"header":"Plant"},"Hu":{"header":"Hu"},"Material":{"header":"Material"},"Quantity":{"header":"Quantity"},"UoM":{"header":"Base Unit of Measure"},"Batch":{"header":"Batch"},"DestStorageType":{"header":"Dest. Storage Type"},"WarehouseTask":{"header":"WarehouseTask"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_EWM_RELOCDOCList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_EWM_RELOCDOCList.onTable().iCheckRows();

            When.onTheZC_EWM_RELOCDOCList.onTable().iPressRow(0);
            Then.onTheZC_EWM_RELOCDOCObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});