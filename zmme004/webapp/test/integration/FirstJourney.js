sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_MM_REBOUNDList.iSeeThisPage();
            Then.onTheZC_MM_REBOUNDList.onFilterBar().iCheckFilterField("{i18n>Owner}");
            Then.onTheZC_MM_REBOUNDList.onFilterBar().iCheckFilterField("{i18n>Material}");
            Then.onTheZC_MM_REBOUNDList.onFilterBar().iCheckFilterField("{i18n>StorageType}");
            Then.onTheZC_MM_REBOUNDList.onTable().iCheckColumns(8, {"Owner":{"header":"{i18n>Owner}"},"Material":{"header":"{i18n>Material}"},"Batch":{"header":"{i18n>Batch}"},"StorageType":{"header":"{i18n>StorageType}"},"StorageBin":{"header":"{i18n>StorageBin}"},"Hu":{"header":"{i18n>Hu}"},"Quantity":{"header":"{i18n>Quantity}"},"GuidParent":{"header":"Parent"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_MM_REBOUNDList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_MM_REBOUNDList.onTable().iCheckRows();

            When.onTheZC_MM_REBOUNDList.onTable().iPressRow(0);
            Then.onTheZC_MM_REBOUNDObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});