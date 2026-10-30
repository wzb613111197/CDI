sap.ui.define([], function () {
	"use strict";

	return {
		/**
		 * Builds the attachment object key with separate active / draft domains.
		 * Active document uses the Crew Info Number as is (CI-0000005),
		 * draft document uses the same number with a DR- prefix (DR-0000005).
		 * @param {string} sZciNumber Crew Info Number
		 * @param {boolean} bIsActiveEntity Draft indicator provided by the OData V4 draft model
		 * @returns {string} attachment object key
		 */
		attachmentKey: function (sZciNumber, bIsActiveEntity) {
			// if (!sZciNumber) {
			// 	return "";
			// }
			// if (bIsActiveEntity === 'No') {
			// 	return "DR" + sZciNumber.substring(2);
			// }
			// return "" + sZciNumber;
			return sZciNumber;
		}
	};
}, /* bExport= */ true);
