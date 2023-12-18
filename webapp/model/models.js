sap.ui.define([
        "sap/ui/model/json/JSONModel",
        "sap/ui/Device"
    ],
    /**
     * provide app-view type models (as in the first "V" in MVVC)
     * 
     * @param {typeof sap.ui.model.json.JSONModel} JSONModel
     * @param {typeof sap.ui.Device} Device
     * 
     * @returns {Function} createDeviceModel() for providing runtime info for the device the UI5 app is running on
     */
    function (JSONModel, Device) {
        "use strict";

        return {
            createDeviceModel: function () {
                var oModel = new JSONModel(Device);
                oModel.setDefaultBindingMode("OneWay");
                return oModel;
            },
            getDetailModel: function() {
                return new JSONModel({
                    resourcesCount: 0,
                    busy: false,
                    delay: 0,
                    lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading"),
                    btnVisible: true,
                    aInputStaffed: [],
                    totalUnassignCap: 0,
                    selectedView: "DAY"
                });
            },
            getDetailDetailModel: function() {
                return new JSONModel({
                    busy: false,
                    selectedView: "DAY"
                });
            }
        };
    });