sap.ui.define(["sap/ui/core/format/DateFormat", "sap/ui/core/format/NumberFormat"], function (DateFormat, NumberFormat) {
    "use strict";

    return {
        /**
         * Format date
         * @public
         * @param {string} sFormat: date pattern, e.g ddMMyyyy
         * @returns {string} formatted date
         */
        returnDataFormat: function (sFormat) {
            return DateFormat.getDateInstance({
                pattern: sFormat
            })
        },
        /**
         * Format currency
         * @public
         * @param {Object{Amount, Currency}} 
         * @returns {string} formatted currency
         */
        returnCurrencyFormat: function (Object) {
            return NumberFormat.getCurrencyInstance().format(Object.Amount, Object.Currency);
        },
        /**
         * Convert hours and days format for display
         * @public
         * @param {number} nValue 
         * @param {string} sKey: Segmented Hours/ Days from selectedView [detailView Model]
         */
        convertHrDay: function (nValue, sKey) {
            var nVal;
            if (sKey === "DAY") {
                nVal = (!!nValue && +nValue !== 0) ? (+nValue / 8).toFixed(1) : +nValue;
            } else if (sKey === "HOUR") {
                nVal = (!!nValue && +nValue !== 0) ? (+nValue).toFixed(0) : +nValue;
            }
            return (nVal) ? nVal : null;
        },
        /**
         * Convert hours and days format for display
         * If empty or null, display as zero
         * @public
         * @param {number} nValue 
         * @param {string} sKey: Segmented Hours/ Days from selectedView [detailView Model]
         */
        convertHrDayZ: function (nValue, sKey) {
            var nVal;
            if (sKey === "DAY") {
                nVal = (!!nValue && +nValue !== 0) ? (+nValue / 8).toFixed(1) : +nValue;
            } else if (sKey === "HOUR") {
                nVal = (!!nValue && +nValue !== 0) ? (+nValue).toFixed(0) : +nValue;
            }
            return (nVal) ? nVal : '0';
        },
        /* Function to generate a UUID */
        generateUUID: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0,
                    v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    };
});