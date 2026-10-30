sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_EWM_INB_GRList.iSeeThisPage();
            Then.onTheZC_EWM_INB_GRList.onFilterBar().iCheckFilterField("{i18n>NewQuantity}");
            Then.onTheZC_EWM_INB_GRList.onFilterBar().iCheckFilterField("{i18n>NewQuantity}");
            Then.onTheZC_EWM_INB_GRList.onFilterBar().iCheckFilterField("{i18n>Vbeln}");
            Then.onTheZC_EWM_INB_GRList.onFilterBar().iCheckFilterField("{i18n>Matnr}");
            Then.onTheZC_EWM_INB_GRList.onFilterBar().iCheckFilterField("{i18n>Ebeln}");
            Then.onTheZC_EWM_INB_GRList.onTable().iCheckColumns(6, {"Vbeln":{"header":"{i18n>Vbeln}"},"Posnr":{"header":"{i18n>Posnr}"},"Matnr":{"header":"{i18n>Matnr}"},"Quantity":{"header":"{i18n>Quantity}"},"NewQuantity":{"header":"{i18n>NewQuantity}"},"GrQuantity":{"header":"{i18n>GrQuantity}"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_EWM_INB_GRList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_EWM_INB_GRList.onTable().iCheckRows();

            When.onTheZC_EWM_INB_GRList.onTable().iPressRow(0);
            Then.onTheZC_EWM_INB_GRObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});