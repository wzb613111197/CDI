sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_PP_LDGRMP_HDRList.iSeeThisPage();
            Then.onTheZC_PP_LDGRMP_HDRList.onFilterBar().iCheckFilterField("{i18n>CalcModeCode}");
            Then.onTheZC_PP_LDGRMP_HDRList.onFilterBar().iCheckFilterField("{i18n>CycleMethod}");
            Then.onTheZC_PP_LDGRMP_HDRList.onFilterBar().iCheckFilterField("{i18n>LoadingTemplateCode}");
            Then.onTheZC_PP_LDGRMP_HDRList.onFilterBar().iCheckFilterField("{i18n>DistributionMethod}");
            Then.onTheZC_PP_LDGRMP_HDRList.onFilterBar().iCheckFilterField("{i18n>Material}");
            Then.onTheZC_PP_LDGRMP_HDRList.onTable().iCheckColumns(13, {"Airline":{"header":"{i18n>Airline}"},"LoadingTemplateCode":{"header":"{i18n>LoadingTemplateCode}"},"LoadingTemplateName":{"header":"{i18n>LoadingTemplateName}"},"ValidFrom":{"header":"{i18n>ValidFrom}"},"ValidTo":{"header":"{i18n>ValidTo}"},"CabinClass":{"header":"{i18n>CabinClass}"},"CalcModeCode":{"header":"{i18n>CalcModeCode}"},"CalculationModeType":{"header":"{i18n>CalculationModeType}"},"CalculationModeValidFrom":{"header":"{i18n>CalculationModeValidFrom}"},"CalculationModeValidTo":{"header":"{i18n>CalculationModeValidTo}"},"CycleMethod":{"header":"{i18n>CycleMethod}"},"DistributionMethod":{"header":"{i18n>DistributionMethod}"},"Material":{"header":"{i18n>Material}"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_PP_LDGRMP_HDRList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_PP_LDGRMP_HDRList.onTable().iCheckRows();

            When.onTheZC_PP_LDGRMP_HDRList.onTable().iPressRow(0);
            Then.onTheZC_PP_LDGRMP_HDRObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});