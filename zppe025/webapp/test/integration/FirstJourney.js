sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_PP_LDGTEMP_HDRList.iSeeThisPage();
            Then.onTheZC_PP_LDGTEMP_HDRList.onFilterBar().iCheckFilterField("Airline Code");
            Then.onTheZC_PP_LDGTEMP_HDRList.onFilterBar().iCheckFilterField("Loading Template Type");
            Then.onTheZC_PP_LDGTEMP_HDRList.onFilterBar().iCheckFilterField("Cabin Class");
            Then.onTheZC_PP_LDGTEMP_HDRList.onFilterBar().iCheckFilterField("{i18n>ValidFrom}");
            Then.onTheZC_PP_LDGTEMP_HDRList.onFilterBar().iCheckFilterField("{i18n>ValidTo}");
            Then.onTheZC_PP_LDGTEMP_HDRList.onFilterBar().iCheckFilterField("{i18n>MealType}");
            Then.onTheZC_PP_LDGTEMP_HDRList.onFilterBar().iCheckFilterField("{i18n>LdgTempCode}");
            Then.onTheZC_PP_LDGTEMP_HDRList.onFilterBar().iCheckFilterField("{i18n>LdgTempName}");
            Then.onTheZC_PP_LDGTEMP_HDRList.onFilterBar().iCheckFilterField("{i18n>CusLdgtempCode}");
            Then.onTheZC_PP_LDGTEMP_HDRList.onTable().iCheckColumns(11, {"AirlineCode":{"header":"Airline Code"},"LdgTempType":{"header":"Loading Template Type"},"LdgTempCode":{"header":"{i18n>LdgTempCode}"},"_Cab/CabinClass":{"header":"{i18n>CabinClass}"},"LdgTempName":{"header":"{i18n>LdgTempName}"},"MealType":{"header":"{i18n>MealType}"},"_Smt/SpecialMealType":{"header":"{i18n>SpecialMealType}"},"ValidFrom":{"header":"{i18n>ValidFrom}"},"ValidTo":{"header":"{i18n>ValidTo}"},"_Mst/CusLdgtempCode":{"header":"{i18n>CusLdgtempCode}"},"ApprovalStatus":{"header":"{i18n>ApprovalStatus}"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_PP_LDGTEMP_HDRList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_PP_LDGTEMP_HDRList.onTable().iCheckRows();

            When.onTheZC_PP_LDGTEMP_HDRList.onTable().iPressRow(0);
            Then.onTheZC_PP_LDGTEMP_HDRObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});