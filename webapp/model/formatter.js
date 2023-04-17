sap.ui.define(["sap/ui/core/format/DateFormat"], function (DateFormat) {
    "use strict";

    return {
        /**
         * Rounds the currency value to 2 digits
         *
         * @public
         * @param {string} sValue value to be formatted
         * @returns {string} formatted currency value with 2 digits
         */
        currencyValue: function (sValue) {
            if (!sValue) {
                return "";
            }

            return parseFloat(sValue).toFixed(2);
        },
        rounding: function (nValue, sKey) {
            var nRound;
            if (!nValue) {
                return nValue;
            }
            if (sKey === "DAY") {
                nRound = (+nValue).toFixed(1);
            } else {
                nRound = (+nValue).toFixed(0);
            }
            return nRound;
        },
        returnDataFormat: function (sFormat) {
            return DateFormat.getDateInstance({
                pattern: sFormat
            })
        },
        convertHrDay: function (nStaffedEffort, sKey, aChanged) {
            if (nStaffedEffort && sKey === "DAY" && nStaffedEffort !== 0) {
                return (+nStaffedEffort / 8).toFixed(1);
            } else {
                return null;
            }
        },
        getButtonType: function (aMessageModel) {
            if (aMessageModel.length === 0) {
                return;
            }
            return aMessageModel.some(o => o.type === "Error") ? "Reject" : "Emphasized";
        }
    };
});