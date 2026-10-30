sap.ui.define([], function () {
    'use strict';

    return {
        /**
         * Converts a "yyyy/MM/dd", "yyyy.MM.dd" or "yyyy-MM-dd" date into the Edm.Date format.
         * @param {string} sValue Source date
         * @returns {string} "yyyy-MM-dd" or an empty string
         */
        toIsoDate: function (sValue) {
            if (!sValue) {
                return '';
            }
            var aParts = String(sValue).substring(0, 10).split(/[-/.]/);
            if (aParts.length !== 3) {
                return '';
            }
            return aParts[0]
                + '-' + String(aParts[1]).padStart(2, '0')
                + '-' + String(aParts[2]).padStart(2, '0');
        },

        /**
         * Converts a "HH:mm" or "HH:mm:ss" time into the Edm.TimeOfDay format.
         * @param {string} sValue Source time
         * @returns {string} "HH:mm:ss" or an empty string
         */
        toEdmTime: function (sValue) {
            if (!sValue) {
                return '';
            }
            var aParts = String(sValue).split(':');
            if (aParts.length < 2) {
                return '';
            }
            return String(aParts[0]).padStart(2, '0')
                + ':' + String(aParts[1]).padStart(2, '0')
                + ':' + String(aParts[2] || '00').padStart(2, '0');
        },

        /**
         * Returns today's date as yyyy-MM-dd.
         * @returns {string} ISO date
         */
        todayIsoDate: function () {
            var oNow = new Date();
            return oNow.getFullYear()
                + '-' + String(oNow.getMonth() + 1).padStart(2, '0')
                + '-' + String(oNow.getDate()).padStart(2, '0');
        },

        /**
         * Extracts a readable message from an error.
         * @param {Error|object} oError Error
         * @returns {string} Message
         */
        extractErrorMessage: function (oError) {
            if (!oError) {
                return '';
            }
            return oError.message || String(oError);
        }
    };
});
