sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZI_EWM_WMS_STOCK_BALANCEList.iSeeThisPage();
            Then.onTheZI_EWM_WMS_STOCK_BALANCEList.onFilterBar().iCheckFilterField("Storage Type");
            Then.onTheZI_EWM_WMS_STOCK_BALANCEList.onFilterBar().iCheckFilterField("Owner");
            Then.onTheZI_EWM_WMS_STOCK_BALANCEList.onFilterBar().iCheckFilterField("Creation Date");
            Then.onTheZI_EWM_WMS_STOCK_BALANCEList.onFilterBar().iCheckFilterField("Creation Time");
            Then.onTheZI_EWM_WMS_STOCK_BALANCEList.onFilterBar().iCheckFilterField("Material Number");
            Then.onTheZI_EWM_WMS_STOCK_BALANCEList.onFilterBar().iCheckFilterField("Storage Bin");
            Then.onTheZI_EWM_WMS_STOCK_BALANCEList.onFilterBar().iCheckFilterField("HU number");
            Then.onTheZI_EWM_WMS_STOCK_BALANCEList.onFilterBar().iCheckFilterField("Timestamp");
            Then.onTheZI_EWM_WMS_STOCK_BALANCEList.onFilterBar().iCheckFilterField("Warehouse Number");
            Then.onTheZI_EWM_WMS_STOCK_BALANCEList.onFilterBar().iCheckFilterField("Display list (List Box)");
            Then.onTheZI_EWM_WMS_STOCK_BALANCEList.onFilterBar().iCheckFilterField("Operation mode (List Box)");
            Then.onTheZI_EWM_WMS_STOCK_BALANCEList.onTable().iCheckColumns(18, {"Erdat":{"header":"Creation Date"},"Erzet":{"header":"Creation Time"},"Lgtyp":{"header":"Storage Type"},"Lgpla":{"header":"Storage Bin"},"Huident":{"header":"HU number"},"Matnr":{"header":"Material Number"},"Charg":{"header":"Batch Number"},"StockSap":{"header":"SAP Stock Quantity"},"StockWms":{"header":"WMS Stock Quantity"},"Diff":{"header":"Difference Quantity"},"Meins":{"header":"Base Unit"},"Owner":{"header":"Owner"},"Zlock":{"header":"Stock Status"},"Vfdat":{"header":"Expiration date"},"Lgnum":{"header":"Warehouse Number"},"Ztimestamp":{"header":"Timestamp"},"DisplayList":{"header":"Display list (List Box)"},"OperationMode":{"header":"Operation mode (List Box)"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZI_EWM_WMS_STOCK_BALANCEList.onFilterBar().iExecuteSearch();
            
            Then.onTheZI_EWM_WMS_STOCK_BALANCEList.onTable().iCheckRows();

            When.onTheZI_EWM_WMS_STOCK_BALANCEList.onTable().iPressRow(0);
            Then.onTheZI_EWM_WMS_STOCK_BALANCEObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});