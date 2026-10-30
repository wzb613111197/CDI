sap.ui.define([], function () {
    "use strict";
    return {
        getProposedQuantity: function (oProposedQuantities, sVbeln, sPosnr) {
            if (!oProposedQuantities || !sVbeln || !sPosnr) {
                return "";
            }
            var sKey = sVbeln + "_" + sPosnr;
            return oProposedQuantities[sKey] !== undefined ? oProposedQuantities[sKey] : "";
        },
        
        isRowEditable: function(sStatus, sStatusDesc) {
            // Log values to verify
            console.log("Formatter.isRowEditable args:", sStatus, sStatusDesc);
            
            var sUpperStatus = (sStatus || "").trim().toUpperCase();
            var sUpperDesc = (sStatusDesc || "").trim().toUpperCase();
            
            if (sUpperStatus === "R" || sUpperStatus === "C" || 
                sUpperDesc === "REJECTED" || sUpperDesc === "COMPLETED" || 
                sUpperDesc.indexOf("REJECTED") !== -1 || sUpperDesc.indexOf("COMPLETED") !== -1) {
                return false; // Not editable
            }
            return true; // Editable
        },

        getCellValue: function (oChangedRows, sVbeln, sPosnr, sOriginalValue, sFieldName, sMeins) {
            if (!sVbeln || !sPosnr) {
                return sOriginalValue || "";
            }
            var sKey = sVbeln + "_" + sPosnr;
            var sResult = sOriginalValue || "";
            if (oChangedRows && oChangedRows[sKey] && oChangedRows[sKey][sFieldName] !== undefined) {
                sResult = oChangedRows[sKey][sFieldName];
            }

            // Format based on UoM if it's a numeric field like lfimg and sMeins is provided
            if (sResult !== undefined && sResult !== null && sResult !== "" && sMeins && sFieldName === 'lfimg') {
                var fVal = parseFloat(sResult);
                if (!isNaN(fVal)) {
                    var aZeroDecimalUnits = ["PC", "EA", "ST", "PCE"];
                    if (aZeroDecimalUnits.includes(sMeins.toUpperCase())) {
                        return fVal.toString();
                    }
                    return fVal.toFixed(3);
                }
            }

            return sResult;
        },

        getMappedValue: function (oValueMap, sVbeln, sPosnr) {
            if (!oValueMap || !sVbeln || !sPosnr) {
                return "";
            }
            var sKey = sVbeln + "_" + sPosnr;
            return oValueMap[sKey] !== undefined && oValueMap[sKey] !== null ? oValueMap[sKey] : "";
        }
    };
});