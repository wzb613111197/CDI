sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZI_EWM_INVENTORYList.iSeeThisPage();
            Then.onTheZI_EWM_INVENTORYList.onFilterBar().iCheckFilterField("{i18n>time_span}");
            Then.onTheZI_EWM_INVENTORYList.onFilterBar().iCheckFilterField("{i18n>start_date}");
            Then.onTheZI_EWM_INVENTORYList.onFilterBar().iCheckFilterField("{i18n>end_date}");
            Then.onTheZI_EWM_INVENTORYList.onFilterBar().iCheckFilterField("{@i18n>owner}");
            Then.onTheZI_EWM_INVENTORYList.onFilterBar().iCheckFilterField("{i18n>item_code}");
            Then.onTheZI_EWM_INVENTORYList.onFilterBar().iCheckFilterField("{i18n>report_format}");
            Then.onTheZI_EWM_INVENTORYList.onTable().iCheckColumns(12, {"item_code":{"header":"{i18n>item_code}"},"customs_code":{"header":"{@i18n>customs_code}"},"item_desc":{"header":"{i18n>item_desc}"},"volum":{"header":"{@i18n>volum}"},"opening":{"header":"{@i18n>opening}"},"received":{"header":"{@i18n>received}"},"issued":{"header":"{@i18n>issued}"},"write_off":{"header":"{@i18n>write_off}"},"closing":{"header":"{@i18n>closing}"},"reference":{"header":"{@i18n>reference}"},"removal_permit":{"header":"{@i18n>removal_permit}"},"first_removal_permit":{"header":"{@i18n>first_removal_permit}"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZI_EWM_INVENTORYList.onFilterBar().iExecuteSearch();
            
            Then.onTheZI_EWM_INVENTORYList.onTable().iCheckRows();

            When.onTheZI_EWM_INVENTORYList.onTable().iPressRow(0);
            Then.onTheZI_EWM_INVENTORYObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});