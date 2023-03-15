sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * Rounds the currency value to 2 digits
         *
         * @public
         * @param {string} sValue value to be formatted
         * @returns {string} formatted currency value with 2 digits
         */
        currencyValue : function (sValue) {
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
                nRound = +nValue.toFixed(1);
            } else {
                nRound = +nValue.toFixed(0);
            }
            return nRound;
        }
    };
});