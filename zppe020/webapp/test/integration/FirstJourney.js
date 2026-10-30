sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_PP_CN_HDRList.iSeeThisPage();
            Then.onTheZC_PP_CN_HDRList.onFilterBar().iCheckFilterField("Airline");
            Then.onTheZC_PP_CN_HDRList.onFilterBar().iCheckFilterField("Flight Number");
            Then.onTheZC_PP_CN_HDRList.onFilterBar().iCheckFilterField("Department");
            Then.onTheZC_PP_CN_HDRList.onFilterBar().iCheckFilterField("Service Type");
            Then.onTheZC_PP_CN_HDRList.onFilterBar().iCheckFilterField("Sched. Dep. Date");
            Then.onTheZC_PP_CN_HDRList.onFilterBar().iCheckFilterField("Departure Date");
            Then.onTheZC_PP_CN_HDRList.onFilterBar().iCheckFilterField("Departure Time");
            Then.onTheZC_PP_CN_HDRList.onFilterBar().iCheckFilterField("Flight Order");
            Then.onTheZC_PP_CN_HDRList.onFilterBar().iCheckFilterField("Operation status");
            Then.onTheZC_PP_CN_HDRList.onFilterBar().iCheckFilterField("Flight Order Status");
            Then.onTheZC_PP_CN_HDRList.onFilterBar().iCheckFilterField("Change Notification Status");
            Then.onTheZC_PP_CN_HDRList.onTable().iCheckColumns(19, {"Zcnno":{"header":"Change Notification No."},"Zdept":{"header":"Department"},"Zcnstatus":{"header":"Change Notification Status"},"Zairlinecode":{"header":"Airline"},"Zfltnum":{"header":"Flight Number"},"ServiceType":{"header":"Service Type"},"AircraftType":{"header":"Aircraft Type"},"TailNumber":{"header":"Tail Number"},"EDD":{"header":"Departure Date"},"ETD":{"header":"Departure Time"},"FlightOrder":{"header":"Flight Order"},"OpFlightStatus":{"header":"Operation status"},"FlightOrderStatus":{"header":"Flight Order Status"},"ZstdDate":{"header":"Sched. Dep. Date"},"STD":{"header":"Sched. Dep. Time"},"ZcreatedAt":{"header":"Created On"},"ZcreatedBy":{"header":"Created By"},"ZchangedBy":{"header":"Changed By"},"ZchangedAt":{"header":"Changed On"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_PP_CN_HDRList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_PP_CN_HDRList.onTable().iCheckRows();

            When.onTheZC_PP_CN_HDRList.onTable().iPressRow(0);
            Then.onTheZC_PP_CN_HDRObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});