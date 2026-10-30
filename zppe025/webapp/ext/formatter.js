sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * Builds the attachment object key for the reuse component.
         * Uses the persisted key when available, otherwise the draft UUID.
         * @param {string} sLdgTempKey Loading template key (active document)
         * @param {string} sDraftUUID  Draft UUID (create/draft scenario)
         * @returns {string} attachment object key
         */
        returnAttachmentKey: function (sLdgTempKey, sDraftUUID) {
            if (sLdgTempKey) {
                return "" + sLdgTempKey;
            }
            if (sDraftUUID) {
                return "" + sDraftUUID;
            }
            return "";
        }
    };
});
