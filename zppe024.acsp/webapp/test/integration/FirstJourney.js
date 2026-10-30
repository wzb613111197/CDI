sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_PP_LDGDEF_ACSPList.iSeeThisPage();
            Then.onTheZC_PP_LDGDEF_ACSPList.onFilterBar().iCheckFilterField("{i18n>AcsPri}");
            Then.onTheZC_PP_LDGDEF_ACSPList.onFilterBar().iCheckFilterField("{i18n>ConType}");
            Then.onTheZC_PP_LDGDEF_ACSPList.onTable().iCheckColumns(8, {"AcsPri":{"header":"{i18n>AcsPri}"},"Description":{"header":"{i18n>Description}"},"_Acsf/ConType":{"header":"{i18n>ConditionType}"},"IsActive":{"header":"{i18n>IsActive}"},"CreatedBy":{"header":"{i18n>CreatedBy}"},"CreatedAt":{"header":"{i18n>CreatedAt}"},"ChangedBy":{"header":"{i18n>ChangedBy}"},"ChangedAt":{"header":"{i18n>ChangedAt}"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_PP_LDGDEF_ACSPList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_PP_LDGDEF_ACSPList.onTable().iCheckRows();

            When.onTheZC_PP_LDGDEF_ACSPList.onTable().iPressRow(0);
            Then.onTheZC_PP_LDGDEF_ACSPObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});