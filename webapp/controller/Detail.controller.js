sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    'sap/m/MessagePopover',
    'sap/m/MessagePopoverItem',
    "sap/m/MessageBox",
    "sap/m/FormattedText",
    "sap/m/library"
], function (BaseController, JSONModel, MessagePopover, MessagePopoverItem, MessageBox, FormattedText, mobileLibrary) {
    "use strict";

    // shortcut for sap.m.URLHelper
    var URLHelper = mobileLibrary.URLHelper;

    return BaseController.extend("StaffingApp.horvath.controller.Detail", {

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        onInit: function () {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page is busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            var oViewModel = new JSONModel({
                resourcesCount: 0,
                busy: false,
                delay: 0,
                lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading"),
                btnVisible: true,
                totalUnassignCap: 0,
                selectedView: "DAY"
            });
            this.getView().setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");
            sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);
            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "detailView");
            this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
        },
        onExit: function () {
            this.getRouter().getRoute("list").detachPatternMatched(this._onObjectMatched, this);
            this.getRouter().getRoute("object").detachPatternMatched(this._onObjectMatched, this);
        },
        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        onChange: function (oEvent) {
            var oSource = oEvent.getSource(),
                sPath = oSource.getBindingContext("detailView").sPath,
                aChangedSPath = oEvent.getSource().getModel("detailView").getProperty("/aChangedSPath");

            if (!oEvent.getParameter("newValue") && aChangedSPath.length > 0) {
                var indexObj = aChangedSPath.findIndex(object => object.sPath === sPath);
                aChangedSPath.splice(indexObj, 1);
            } else {
                var aChanged = aChangedSPath.filter(obj => obj.sPath === sPath);
                if (aChanged.length > 0) {
                    aChanged[0].value = oEvent.getParameter("newValue");
                } else {
                    aChangedSPath.push({ sPath, value: oEvent.getParameter("newValue"), inputId: oEvent.getParameter("id") });
                }
            }
            oEvent.getSource().getModel("detailView").refresh(true);
        },
        onSave: function (oEvent) {
            var detailModel = oEvent.getSource().getModel("detailView");
            var selectedView = detailModel.getProperty("/selectedView");
            var increment = (selectedView === "DAY") ? 0.5 : 4;
            var message = new FormattedText("FormattedText_" + new Date().getTime(), { htmlText: this.getResourceBundle().getText("savedMessage", [selectedView]) });

            for (var index in detailModel.getProperty("/aChangedSPath")) {
                if (+detailModel.getProperty("/aChangedSPath")[index].value % increment !== 0) {
                    this.addMessageManager({ message: "Please enter half or full days only.", type: "Error" });
                    return;
                }
            }
            MessageBox.confirm(message, {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction === "CANCEL") return;
                    this._updateModel();
                }.bind(this)
            });
        },
        onSegmentChanged: function (oEvent) {
            this.getModel("detailView").refresh(true);
        },
        onEmployeePress: function (oEvent, oDetailModel) {
            this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
            this.getModel("appView").setProperty("/layout", "EndColumnFullScreen");
            this.getOwnerComponent().getRouter().navTo("detailDetail", {
                object: encodeURIComponent(JSON.stringify(oDetailModel))
            });
        },
        /**
         * Set the full screen mode to false and navigate to list page
         */
        onCloseDetailPress: function () {
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
            // No item should be selected on list after detail page is closed
            // this.getOwnerComponent().oListSelector.clearListListSelection();
            sap.ui.getCore().getMessageManager().removeAllMessages();
            this.getRouter().navTo("list");
        },
        onMessagesButtonPress: function (oEvent) {
            var oMessagesButton = oEvent.getSource();
            if (!this._messagePopover) {
                this._messagePopover = new MessagePopover({
                    items: {
                        path: "message>/",
                        template: new MessagePopoverItem({
                            description: "{message>description}",
                            type: "{message>type}",
                            title: "{message>message}"
                        })
                    }
                });
                oMessagesButton.addDependent(this._messagePopover);
            }
            this._messagePopover.toggle(oMessagesButton);
        },
        /**
        * Toggle between full and non full screen mode.
        */
        toggleFullScreen: function () {
            var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
            if (!bFullScreen) {
                // store current layout and go full screen
                this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
                this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
            } else {
                // reset to previous layout
                this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            }
        },
        onCollapseAll: function (oEvent) {
            this.byId("idTreeTable").collapseAll();
        },
        onExpandAll: function (oEvent) {
            this.byId("idTreeTable").expandToLevel(3);
        },

        /* =========================================================== */
        /* begin: internal methods                                     */
        /* =========================================================== */

        /**
         * Binds the view to the object path and expands the aggregated line items.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched: async function (oEvent) {
            var oArguments = oEvent.getParameter("arguments"),
                aChanged = this.getModel("detailView").getProperty("/aChangedSPath") || [];

            this.oContextObj = JSON.parse(decodeURIComponent(oArguments.object))
            sap.ui.getCore().getMessageManager().removeAllMessages();
            this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            // Clear last input field value from previous project before clearing aChangePath
            aChanged.forEach((oChangedSPath) => { sap.ui.getCore().byId(oChangedSPath.inputId).setValue('') });
            this.getModel("detailView").setData(Object.assign(this.getModel("detailView").getData(), this.oContextObj, {
                StartDate: new Date(this.oContextObj.StartDate),
                EndDate: new Date(this.oContextObj.EndDate),
                aChangedSPath: [],
                aTimeRecUpdate: []
            }));
            this.getModel("detailView").setProperty("/busy", true);
            await this._fetchResources(this.oContextObj);
        },
        _fetchResources: async function (oContextObj) {
            var oCurrPeriod = this.getCurrentPeriod();
            return new Promise((resolve, reject) => {
                Promise.all(this.getResourcePath(oContextObj, oCurrPeriod).map(resource => this.fetchResources(resource))).then(function (oResp) {
                    var oTreeData = { Node: [] },
                        oDetailModel = this.getModel("detailView"),
                        [, aEmpCapaciy, aProjEng, aProjAssignDistr, aTimeRec] = oResp.map(({ results }) => results);

                    oDetailModel.setProperty("/resourcesCount", oResp[0].results.length);
                    debugger;
                    /* Workpackage level */
                    for (var wpIndex in oResp[0].results) {
                        var oWpItem = oResp[0].results[wpIndex],
                            nBaseLine = aProjEng.reduce((acc, curr) => {
                                if (curr.Version === "2" && curr.WorkPackage === oWpItem.WorkPackageID) {
                                    return acc + +curr.Quantity;
                                }
                                return acc;
                            }, 0);
                        oTreeData.Node.push({
                            Name: [oWpItem.WorkPackageName, oWpItem.WorkPackageID].join(" "),
                            Baseline: (nBaseLine > 0) ? nBaseLine : null,
                            bLink: false,
                            bInputVisible: false,
                            Node: []
                        });
                        if (aEmpCapaciy.length === 0) {
                            continue;
                        }
                        var aEmpCap = aEmpCapaciy.filter((Object) => {
                            if (Object.WorkPackage === oWpItem.WorkPackageID) {
                                return Object;
                            }
                        }),
                            oWpNodeLine = oTreeData.Node[oTreeData.Node.length - 1],
                            aEmpNode = oWpNodeLine.Node;

                        /* Employee level */
                        for (var nEmpIdx in aEmpCap) {
                            var oEmpCapacity = aEmpCap[nEmpIdx],
                                oTimeRec = aTimeRec.find(o => o.PersonWorkAgreement === oEmpCapacity.PersonWorkAgreement && o.YearMth === oEmpCapacity.YearMth),
                                // oTimeRec = { ...oTimeRec, bTimeRec: oTimeRec && +oTimeRec.RecordedQuantity > 0 },
                                oProjAssignDistr = aProjAssignDistr.find(o => o.ProjDmndRsceAssgmt === oEmpCapacity.PersonWorkAgreement && o.YearMth === oEmpCapacity.YearMth),
                                { ContractTypeName, ...restOfEmpCapacity } = oEmpCapacity;

                            oWpNodeLine.ContractTypeName = oWpNodeLine.ContractTypeName || oEmpCapacity.ContractTypeName;
                            if (aEmpNode.length === 0 || !aEmpNode.some(i => i['WorkAgrementID'] === oEmpCapacity.PersonWorkAgreement)) {
                                // shorten
                                var nEmpBaseLine = aProjEng.reduce((acc, curr) => {
                                    if (curr.Version === "2" && curr.WorkPackage === oWpItem.WorkPackageID && curr.PersonWorkAgreement === oEmpCapacity.PersonWorkAgreement) {
                                        return acc + +curr.Quantity;
                                    }
                                    return acc;
                                }, 0);
                                aEmpNode.push({
                                    ...restOfEmpCapacity, ...{
                                        WorkAgrementID: oEmpCapacity.PersonWorkAgreement,
                                        Name: oEmpCapacity.PersonFullName,
                                        Baseline: (nEmpBaseLine > 0) ? nEmpBaseLine : null,
                                        bLink: false,
                                        bInputVisible: false,
                                        Node: []
                                    }
                                });
                            }

                            /* Employee distribution month */
                            var oEmpNodeLine = aEmpNode[aEmpNode.length - 1],
                                { ServiceCostLevelName, ContractTypeName, ...restOfEmpCapacity } = oEmpCapacity;
                            if (+oEmpCapacity.YearMth < oCurrPeriod.nMinMth) {
                                if (!oEmpNodeLine.Node.some((objP) => !!objP.preMth)) {
                                    oEmpNodeLine.Node.push({
                                        Name: this.getResourceBundle().getText("Sumofpreviousmonths"),
                                        preMth: true,
                                        bLink: false,
                                        bInputVisible: false,
                                        Node: []
                                    });
                                }
                                // Push time recording into aTimeRecUpdate for save later
                                // Only previous month
                                // If time recording value same as Staffed then ignore
                                (oTimeRec && +oTimeRec.RecordedQuantity > 0 && +oTimeRec.RecordedQuantity !== +oEmpCapacity.PlndEffortQty && oProjAssignDistr) ? oDetailModel.getProperty("/aTimeRecUpdate").push({ ProjDmndRsceAssgmtDistrUUID: oProjAssignDistr.ProjDmndRsceAssgmtDistrUUID, value: oTimeRec.RecordedQuantity }) : "";
                                var preMthLines = oEmpNodeLine.Node.filter((i) => (i.preMth)),
                                    aPreNode = preMthLines[0].Node;
                                aPreNode.push(this._returnMthDist({ ...restOfEmpCapacity, Level: oEmpCapacity.ServiceCostLevelName, ...(oTimeRec ? oTimeRec : ""), ...{ bLink: true, bInputVisible: false, ProjDmndRsceAssgmtDistrUUID: (oProjAssignDistr) ? oProjAssignDistr.ProjDmndRsceAssgmtDistrUUID : "" } }));
                                this._calculateValues(preMthLines[0]);
                            } else if (+oEmpCapacity.YearMth > oCurrPeriod.nMaxMth) {
                                if (!oEmpNodeLine.Node.some((objUp) => !!objUp.upcomMth)) {
                                    oEmpNodeLine.Node.push({
                                        Name: this.getResourceBundle().getText("Sumofupcomingmonths"),
                                        upcomMth: true,
                                        bLink: false,
                                        bInputVisible: false,
                                        Node: []
                                    });
                                }
                                var upComMthLines = oEmpNodeLine.Node.filter((i) => (i.upcomMth)),
                                    aUpcomNode = upComMthLines[0].Node;
                                aUpcomNode.push(this._returnMthDist({ ...restOfEmpCapacity, Level: oEmpCapacity.ServiceCostLevelName, ...(oTimeRec ? oTimeRec : ""), ...{ bLink: true, bInputVisible: false } }));
                                this._calculateValues(upComMthLines[0]);
                            } else {
                                if (!oEmpNodeLine.Node.some((objCur) => !!objCur.bCurMth)) {
                                    oEmpNodeLine.Node.push({
                                        Name: this.getResourceBundle().getText("Sumofcurrentmonths"),
                                        bCurMth: true,
                                        bLink: false,
                                        bInputVisible: false,
                                        Node: []
                                    });
                                }
                                var aCurMthLines = oEmpNodeLine.Node.filter((i) => (i.bCurMth)),
                                    aCurMthNode = aCurMthLines[0].Node;
                                aCurMthNode.push(this._returnMthDist({ ...restOfEmpCapacity, Level: oEmpCapacity.ServiceCostLevelName, ...(oTimeRec ? oTimeRec : ""), ...{ nStaffedNew: +oEmpCapacity.PlndEffortQty, bLink: true, bInputVisible: true, ProjDmndRsceAssgmtDistrUUID: (oProjAssignDistr) ? oProjAssignDistr.ProjDmndRsceAssgmtDistrUUID : "" } }));
                                this._calculateValues(aCurMthLines[0]);
                            }
                            this._calculateValues(oEmpNodeLine);
                        }
                        this._calculateValues(oWpNodeLine);
                    }
                    this.getModel("detailView").setProperty("/totalUnassignCap", oTreeData.Node.map((o) => o.UnassignedCap).reduce((prev, curr) => +prev + +curr, 0));
                    this.getModel("detailView").setProperty("/resource", oTreeData);
                    this.getModel("detailView").refresh(true);
                    this.getModel("detailView").setProperty("/busy", false);
                    resolve(this.getModel("detailView").getProperty("/resource"));
                }.bind(this)).catch(function (oErr) {
                    this.getModel("detailView").setProperty("/busy", false);
                    reject(oErr);
                }.bind(this));
            });
        },
        _onMetadataLoaded: function () { },
        _fetchCsrfToken: function (oModel) {
            return new Promise((resolve, reject) => {
                try {
                    oModel.refreshSecurityToken(function (oResp) {
                        resolve(oModel.getSecurityToken());
                    }.bind(this));
                } catch (oError) {
                    this.getModel("detailView").setProperty("/busy", false);
                    reject(oError);
                }

            })
        },
        _updateModel: async function () {
            this.getModel("detailView").setProperty("/busy", false);
            var aProjDmdModel = this.getModel("ProjectDemand"),
                oDetailModel = this.getModel("detailView"),
                aChangedSPath = oDetailModel.getProperty("/aChangedSPath"),
                aTimeRecUpdate = oDetailModel.getProperty("/aTimeRecUpdate"),
                object = {};

            if (aChangedSPath.length === 0 && aTimeRecUpdate === 0) {
                return;
            }
            this.getModel("detailView").setProperty("/busy", true);
            aProjDmdModel.setUseBatch(true);
            aProjDmdModel.setDeferredGroups(["BatchQuery"]);
            var csrfToken = await this._fetchCsrfToken(aProjDmdModel);
            object.mParameters = {
                groupId: "BatchQuery",
                // changeSetId: "BatchQuery",
                method: "PATCH",
                headers: { "X-CSRF-Token": csrfToken }
            };
            object.oModel = aProjDmdModel;
            for (var index in aChangedSPath) {
                var oChanged = aChangedSPath[index],
                    oContext = this.getModel("detailView").getProperty(aChangedSPath[index].sPath);
                object.sKey = aProjDmdModel.createKey("/A_ProjDmndRsceAssgmtDistr", {
                    ProjDmndRsceAssgmtDistrUUID: oContext.ProjDmndRsceAssgmtDistrUUID
                });
                object.oPayload = {
                    ProjDmndRsceAssgmtDistrQty: (oDetailModel.getProperty("/selectedView") === "DAY") ? Math.round(oChanged.value * 8).toString() : oChanged.value.toString()
                };
                this.updateModel(object);
            };
            for (var index in aTimeRecUpdate) {
                var oContext = aTimeRecUpdate[index];
                object.sKey = aProjDmdModel.createKey("/A_ProjDmndRsceAssgmtDistr", {
                    ProjDmndRsceAssgmtDistrUUID: oContext.ProjDmndRsceAssgmtDistrUUID
                });
                // Time Recording not required to convert hour/day because the value is already in hour
                object.oPayload = {
                    ProjDmndRsceAssgmtDistrQty: oContext.value.toString()
                };
                this.updateModel(object);
            }
            aProjDmdModel.submitChanges(Object.assign(object.mParameters, {
                success: async function (oResp, o) {
                    var oMessageModel = this.getModel("message"),
                        aChangedSPath = this.getModel("detailView").getProperty("/aChangedSPath"),
                        aTimeRecUpdate = this.getModel("detailView").getProperty("/aTimeRecUpdate");

                    this.addMessageManager({ message: this.getResourceBundle().getText("UpdateSuccessMsg", +(aChangedSPath.length + aTimeRecUpdate.length)), type: sap.ui.core.MessageType.Success });
                    aChangedSPath.forEach(function (oChangedSPath) {
                        sap.ui.getCore().byId(oChangedSPath.inputId).setValue('');
                    });
                    this.getModel("detailView").setProperty("/aChangedSPath", []);
                    this.getModel("detailView").setProperty("/aTimeRecUpdate", [])
                    this.getModel("ProjectDemand").setUseBatch(false);
                    await this._fetchResources(this.oContextObj);
                }.bind(this),
                error: function (oErr) {
                    for (var idx in aChangedSPath) {
                        this.getModel("ProjectDemand").resetChanges([aChangedSPath[idx].sPath], true);
                    }
                    this.getModel("ProjectDemand").setUseBatch(false);
                    this.getModel("detailView").setProperty("/busy", false);
                }.bind(this)
            }));
        },
        _returnMthDist: function (Object) {
            var nAssignedCap = +Object.AvailabilityInHours - +Object.PlndEffortQty;
            return {
                ...Object, ...{
                    WorkPackage: Object.WorkPackage,
                    Name: this.formatter.returnDataFormat("MMM yyyy").format(new Date([Object.YearMth.substr(0, 4), Object.YearMth.substr(4, 2), "01"].join("-"))),
                    YearMth: Object.YearMth,
                    TimeRecordings: (+Object.RecordedQuantity > 0) ? +Object.RecordedQuantity : null,
                    Staffed: +Object.PlndEffortQty,
                    UnassignedCap: nAssignedCap,
                    bLink: Object.bLink,
                    bInputVisible: Object.bInputVisible
                }
            }
        },
        _calculateValues: function (nodeLine) {
            nodeLine.Staffed = nodeLine.Node.map((o) => o.Staffed).reduce((prev, curr) => +prev + +curr, 0) || null;
            nodeLine.TimeRecordings = nodeLine.Node.map((o) => o.TimeRecordings).reduce((prev, curr) => +prev + +curr, 0) || null;
            nodeLine.UnassignedCap = nodeLine.Node.map((o) => o.UnassignedCap).reduce((prev, curr) => +prev + +curr, 0);
        }
    });
});