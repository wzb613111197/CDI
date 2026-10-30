sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_PP_EQUISPEC_ROTList.iSeeThisPage();
            Then.onTheZC_PP_EQUISPEC_ROTList.onFilterBar().iCheckFilterField("{i18n>ZequipCode}");
            Then.onTheZC_PP_EQUISPEC_ROTList.onFilterBar().iCheckFilterField("{i18n>ZequipType}");
            Then.onTheZC_PP_EQUISPEC_ROTList.onFilterBar().iCheckFilterField("{i18n>Zdescription}");
            Then.onTheZC_PP_EQUISPEC_ROTList.onFilterBar().iCheckFilterField("{i18n>ZapprStatus}");
            Then.onTheZC_PP_EQUISPEC_ROTList.onTable().iCheckColumns(4, {"ZequipCode":{"header":"{i18n>ZequipCode}"},"ZequipType":{"header":"{i18n>ZequipType}"},"Zdescription":{"header":"{i18n>Zdescription}"},"ZapprStatus":{"header":"{i18n>ZapprStatus}"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_PP_EQUISPEC_ROTList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_PP_EQUISPEC_ROTList.onTable().iCheckRows();

            When.onTheZC_PP_EQUISPEC_ROTList.onTable().iPressRow(0);
            Then.onTheZC_PP_EQUISPEC_ROTObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});