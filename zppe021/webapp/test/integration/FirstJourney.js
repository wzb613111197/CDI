sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.iSeeThisPage();
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("Airline");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("Flight Number");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("SDD");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("STD");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("EDD");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("ETD");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("Haul Type");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("Service Type");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("Aircraft Type");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("Tail Number");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("Operation status");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("Flight Order Number");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("Flight Order Status");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("Origin");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("Destination");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("Destination Area");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("SDA");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("STA");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("EDA");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("ETA");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iCheckFilterField("Parking Bay");
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onTable().iCheckColumns(29, {"AirlineCode":{"header":"Airline Code"},"FlightNum":{"header":"Flight Number"},"Destination":{"header":"Sector1"},"Sector2":{"header":"Sector2"},"SDD":{"header":"SDD"},"STD_H":{"header":"STD"},"EDD":{"header":"EDD"},"ETD":{"header":"ETD"},"ATD_date":{"header":"ADD"},"ATD_time":{"header":"ATD"},"InbSchArrivalDate":{"header":"SDA"},"InbSchArrivalTime":{"header":"STA"},"InbEstArrivalDate":{"header":"EDA"},"InbEstArrivalTime":{"header":"ETA"},"UTCOffset":{"header":"UTC Offset"},"AircraftType":{"header":"Aircraft Type"},"ServiceType":{"header":"Service Type"},"HandleType":{"header":"Handling Type"},"TailNumber":{"header":"Tail Number"},"ParkingBay":{"header":"Parking Bay"},"DestinationArea":{"header":"Destination Area"},"HaulType":{"header":"Haul Type"},"WeekDay":{"header":"WeekDay"},"FlightOrderNum":{"header":"Flight Order Number"},"FlightOrderStatus":{"header":"Flight Order Status"},"ColdRoomDate":{"header":"Cold Room Date"},"ColdRoomTime":{"header":"Cold Room Time"},"LoadingBayDate":{"header":"Loading Bay Date"},"LoadingBayTime":{"header":"Loading Bay Time"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onTable().iCheckRows();

            When.onTheZC_PP_MANAGE_FLIGHT_ORDERList.onTable().iPressRow(0);
            Then.onTheZC_PP_MANAGE_FLIGHT_ORDERObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});