sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    'sap/m/MessagePopover',
    'sap/m/MessagePopoverItem',
    "sap/m/MessageBox",
    "sap/m/FormattedText",
    "sap/m/library",
    "sap/ui/core/message/Message"
], function (BaseController, JSONModel, Filter, FilterOperator, Sorter, MessagePopover, MessagePopoverItem, MessageBox, FormattedText, mobileLibrary, Message) {
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
                aChangedSPath: [],
                totalUnassignCap: 0,
                selectedView: "HOUR"
            });
            this.getView().setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");
            sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);
            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "detailView");
            this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        onChange: function (oEvent) {
            var oSource = oEvent.getSource(),
                oContext = oSource.getBindingInfo("value").binding.aBindings[0].getContext(),
                sPath = oContext.sPath,
                aChangedSPath = oEvent.getSource().getModel("detailView").getProperty("/aChangedSPath");
            if (!oEvent.getParameter("newValue") && aChangedSPath.length > 0) {
                var indexObj = aChangedSPath.findIndex(object => {
                    return object.sPath === sPath;
                });
                aChangedSPath.splice(indexObj, 1);
                oEvent.getSource().getModel("detailView").refresh(true);
                return;
            }
            var aChanged = aChangedSPath.filter(obj => obj.sPath === sPath);
            if (aChanged.length > 0) {
                aChanged[0].value = oEvent.getParameter("newValue");
                return;
            }
            aChangedSPath.push({ sPath: sPath, value: oEvent.getParameter("newValue") });
            oEvent.getSource().getModel("detailView").setProperty(sPath + "/StaffedNew", oEvent.getParameter("newValue"));
            oEvent.getSource().getModel("detailView").refresh(true);
        },
        onSave: function (oEvent) {
            var oDetailModel = oEvent.getSource().getModel("detailView"),
                sMessage = new FormattedText("FormattedText", {
                    htmlText: this.getResourceBundle().getText("savedMessage", [oDetailModel.getProperty("/selectedView")])
                });
            MessageBox.confirm(sMessage, {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction === "CANCEL") {
                        return;
                    }
                    this._updateModel();
                }.bind(this)
            });
        },
        onSegmentChanged: function (oEvent) {
            this.getModel("detailView").refresh(true);
        },
        onEmployeePress: function (oEvent, oDetailModel) {
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
        /**
         * Updates the item count within the line item table's header
         * @param {object} oEvent an event containing the total number of items in the list
         * @private
         */
        onListUpdateFinished: function (oEvent) {
            var sTitle,
                iTotalItems = oEvent.getParameter("total"),
                oViewModel = this.getModel("detailView");

            // only update the counter if the length is final
            if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
                if (iTotalItems) {
                    sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
                } else {
                    //Display 'Line Items' instead of 'Line items (0)'
                    sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
                }
                oViewModel.setProperty("/lineItemListTitle", sTitle);
            }
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
        onExit: function () {
            this.getRouter().getRoute("list").detachPatternMatched(this._onObjectMatched, this);
            this.getRouter().getRoute("object").detachPatternMatched(this._onObjectMatched, this);
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
        _onObjectMatched: function (oEvent) {
            var oArguments = oEvent.getParameter("arguments"),
                oContextObj = JSON.parse(decodeURIComponent(oArguments.object)),
                oCurrPeriod = this._getCurrentPeriod();

            sap.ui.getCore().getMessageManager().removeAllMessages();
            this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            this.getModel("detailView").setData(Object.assign(this.getModel("detailView").getData(), oContextObj, {
                StartDate: new Date(oContextObj.StartDate),
                EndDate: new Date(oContextObj.EndDate)
            }));
            this.getModel("detailView").setProperty("/busy", true);
            Promise.all([this.fetchResources({
                oModel: this.getView().getModel(),
                sPath: "/WorkpackageSet",
                aFilters: [new Filter("ProjectID", FilterOperator.EQ, oContextObj.ProjectID)],
                oParams: { "$select": "WorkPackageID,WorkPackageName" },
                aSort: [new Sorter("WorkPackageID", false)]
            }),
            this.fetchResources({
                oModel: this.getView().getModel("EmployeeCapacity"),
                sPath: "/YY1_EMP_CAPACITY_API",
                aFilters: [new Filter("EngagementProject", FilterOperator.EQ, oContextObj.ProjectID)],
                aSort: [new Sorter("PersonWorkAgreement", false), new Sorter("YearMth", false)]
            }),
            this.fetchResources({
                oModel: this.getOwnerComponent().getModel("PROJ_ENGMT_UPDATE_SRV"),
                sPath: "/A_EngmntProjRsceSup",
                oParams: { "$select": "WorkPackage,Version,Quantity" },
                aFilters: [new Filter("EngagementProject", FilterOperator.EQ, oContextObj.ProjectID)]
            }),
            this.fetchResources({
                oModel: this.getView().getModel("ProjectAssignmentDistr"),
                sPath: "/YY1_PROJ_ASSIGNMENT_DISTR",
                aFilters: [new Filter("Project", FilterOperator.EQ, oContextObj.ProjectID),
                new Filter("YearMth", FilterOperator.BT, oCurrPeriod.nMinMth.toString(), oCurrPeriod.nMaxMth.toString(), true)],
                aSort: [new Sorter("YearMth", false)]
            })
            ]).then(function (oResp) {
                var oTreeData = { Node: [] },
                    oDetailModel = this.getModel("detailView"),
                    aEmpCapaciy = oResp[1].results,
                    aProjEng = oResp[2].results,
                    aProjAssignDistr = oResp[3].results;

                oDetailModel.setProperty("/resourcesCount", oResp[0].results.length);

                /* Workpackage level */
                for (var wpIndex in oResp[0].results) {
                    var oWpItem = oResp[0].results[wpIndex],
                        nBaseLine = aProjEng.filter((a) => {
                            if (a.Version === "2" && a.WorkPackage === oWpItem.WorkPackageID) {
                                return a
                            }
                        }).map((m) => m.Quantity).reduce((prev, curr) => +prev + +curr, 0);
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
                    })
                    var oWpNodeLine = oTreeData.Node[oTreeData.Node.length - 1],
                        aEmpNode = oWpNodeLine.Node;

                    /* Employee level */
                    for (var nEmpIdx in aEmpCap) {
                        var oEmpCapacity = aEmpCap[nEmpIdx];
                        if (aEmpNode.length === 0 || !aEmpNode.some(i => i['WorkAgrementID'] === oEmpCapacity.PersonWorkAgreement)) {
                            aEmpNode.push({
                                ...oEmpCapacity, ...{
                                    WorkAgrementID: oEmpCapacity.PersonWorkAgreement,
                                    Name: oEmpCapacity.PersonFullName,
                                    bLink: false,
                                    bInputVisible: false,
                                    Node: []
                                }
                            });
                        }

                        /* Employee distribution month */
                        var oEmpNodeLine = aEmpNode[aEmpNode.length - 1];
                        if (+oEmpCapacity.YearMth < oCurrPeriod.nMinMth) {
                            if (!oEmpNodeLine.Node.some((objP) => !!objP.preMth)) {
                                oEmpNodeLine.Node.push({
                                    Name: "Sum of previous months",
                                    preMth: true,
                                    bLink: false,
                                    bInputVisible: false,
                                    Node: []
                                });
                            }
                            var preMthLines = oEmpNodeLine.Node.filter((i) => (i.preMth)),
                                aPreNode = preMthLines[0].Node;
                            aPreNode.push(this._returnMthDist({ ...oEmpCapacity, ...{ bLink: true, bInputVisible: false } }));
                            this._calculateValues(preMthLines[0]);
                        } else if (+oEmpCapacity.YearMth > oCurrPeriod.nMaxMth) {
                            if (!oEmpNodeLine.Node.some((objUp) => !!objUp.upcomMth)) {
                                oEmpNodeLine.Node.push({
                                    Name: "Sum of upcoming months",
                                    upcomMth: true,
                                    bLink: false,
                                    bInputVisible: false,
                                    Node: []
                                });
                            }
                            var upComMthLines = oEmpNodeLine.Node.filter((i) => (i.upcomMth)),
                                aUpcomNode = upComMthLines[0].Node;
                            aUpcomNode.push(this._returnMthDist({ ...oEmpCapacity, ...{ bLink: true, bInputVisible: false } }));
                            this._calculateValues(upComMthLines[0]);
                        } else {
                            if (!oEmpNodeLine.Node.some((objCur) => !!objCur.bCurMth)) {
                                oEmpNodeLine.Node.push({
                                    Name: "Sum of current months",
                                    bCurMth: true,
                                    bLink: false,
                                    bInputVisible: false,
                                    Node: []
                                });
                            }
                            var aCurMthLines = oEmpNodeLine.Node.filter((i) => (i.bCurMth)),
                                aCurMthNode = aCurMthLines[0].Node,
                                oProjAssignDistr = aProjAssignDistr.find(o => o.ProjDmndRsceAssgmt === oEmpCapacity.PersonWorkAgreement && o.YearMth === oEmpCapacity.YearMth);
                            aCurMthNode.push(this._returnMthDist({ ...oEmpCapacity, ...{ nStaffedNew: +oEmpCapacity.PlndEffortQty, bLink: true, bInputVisible: true, ProjDmndRsceAssgmtDistrUUID: oProjAssignDistr.ProjDmndRsceAssgmtDistrUUID } }));
                            this._calculateValues(aCurMthLines[0]);
                        }
                        this._calculateValues(oEmpNodeLine);
                    }
                    this._calculateValues(oWpNodeLine);
                }
                this.getModel("detailView").setProperty("/totalUnassignCap", oTreeData.Node.map((o) => o.UnassignedCap).reduce((prev, curr) => +prev + +curr, 0));
                this.getView().getModel("detailView").setProperty("/resource", oTreeData);
                this.getView().getModel("detailView").refresh(true);
                this.getModel("detailView").setProperty("/busy", false);
                // this.byId("idTreeTable").autoResizeColumn();
            }.bind(this)).catch(function (oErr) {
                this.getModel("detailView").setProperty("/busy", false);
            }.bind(this));
        },

        /**
         * Binds the view to the object path. Makes sure that detail view displays
         * a busy indicator while data for the corresponding element binding is loaded.
         * @function
         * @param {string} sObjectPath path to the object to be bound to the view.
         * @private
         */
        _bindView: function (sObjectPath) {
            // Set busy indicator during view binding
            var oViewModel = this.getModel("detailView");

            // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
            oViewModel.setProperty("/busy", false);

            this.getView().bindElement({
                path: sObjectPath,
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        oViewModel.setProperty("/busy", false);
                    }
                }
            });
        },

        _onBindingChange: function () {
            var oView = this.getView(),
                oElementBinding = oView.getElementBinding();

            // No data for the binding
            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("detailObjectNotFound");
                // if object could not be found, the selection in the list
                // does not make sense anymore.
                this.getOwnerComponent().oListSelector.clearListListSelection();
                return;
            }

            var sPath = oElementBinding.getPath(),
                oResourceBundle = this.getResourceBundle(),
                oObject = oView.getModel().getObject(sPath),
                sObjectId = oObject.ProjectID,
                sObjectName = oObject.ProjectName,
                oViewModel = this.getModel("detailView");

            this.getOwnerComponent().oListSelector.selectAListItem(sPath);
        },

        _onMetadataLoaded: function () { },

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
                this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
            }
        },
        fetchCsrfToken: function (oModel) {
            return new Promise((resolve, reject) => {
                try {
                    oModel.refreshSecurityToken(function (oResp) {
                        // Access the CSRF token value from the HTTP headers
                        resolve(oModel.getSecurityToken());
                    }.bind(this));
                } catch (oError) {
                    reject(oError);
                    this.getModel("detailView").setProperty("/busy", false);
                }

            })
        },
        _updateModel: async function () {
            this.getModel("detailView").setProperty("/busy", false);
            var aProjDmdModel = this.getModel("ProjectDemand"),
                oDetailModel = this.getView().getModel("detailView"),
                aChangedSPath = oDetailModel.getProperty("/aChangedSPath"),
                object = {};

            if (aChangedSPath.length === 0) {
                return;
            }
            this.getModel("detailView").setProperty("/busy", true);
            aProjDmdModel.setUseBatch(true);
            aProjDmdModel.setDeferredGroups(["BatchQuery"]);
            var csrfToken = await this.fetchCsrfToken(aProjDmdModel);
            object.mParameters = {
                groupId: "BatchQuery",
                // changeSetId: "BatchQuery",
                method: "PATCH",
                headers: { "X-CSRF-Token": csrfToken }
            };
            for (var index in aChangedSPath) {
                var oChanged = aChangedSPath[index],
                    oContext = this.getModel("detailView").getProperty(aChangedSPath[index].sPath);

                object.oModel = aProjDmdModel;
                object.sKey = aProjDmdModel.createKey("/A_ProjDmndRsceAssgmtDistr", {
                    ProjDmndRsceAssgmtDistrUUID: oContext.ProjDmndRsceAssgmtDistrUUID
                });
                object.oPayload = {
                    ProjDmndRsceAssgmtDistrQty: (oDetailModel.getProperty("/selectedView") === "DAY") ? (oChanged.value * 8).toString() : (oChanged.value).toString()
                };
                this.updateModel(object);
            };
            aProjDmdModel.submitChanges(Object.assign(object.mParameters, {
                success: function (oResp) {
                    var oMsgModel = this.getModel("message"),
                        aChangedSPath = this.getModel("detailView").getProperty("/aChangedSPath");
                    // if (oMsgModel.getData()[0].type !== "Success") {
                    //     for (var idx in aChangedSPath) {
                    //         aProjDmdModel.resetChanges([aChangedSPath[idx].sPath], true);
                    //     }
                    //     aProjDmdModel.setUseBatch(false);
                    //     this.getModel("detailView").setProperty("/busy", false);
                    //     return;
                    // }
                    var oMessageManager = sap.ui.getCore().getMessageManager();
                    var oMessage = new Message({
                        message: "Updated successfully",
                        type: sap.ui.core.MessageType.Success,
                        // description: "Updated successfully",
                        target: "/messagePath",
                        processor: null
                    });
                    oMessageManager.addMessages(oMessage);
                    this.getModel("detailView").setProperty("/aChangedSPath", [])
                    // Run fetch resource
                    this.getModel("detailView").setProperty("/busy", false);
                    this.getModel("ProjectDemand").setUseBatch(false);
                    this.getModel("detailView").refresh(true);
                }.bind(this),
                error: function (oErr) {
                    for (var idx in aChangedSPath) {
                        this.getModel("ProjectDemand").resetChanges([aChangedSPath[idx].sPath], true);
                    }
                    this.getModel("ProjectDemand").setUseBatch(false);
                    this.getModel("ProjectDemand").setUseBatch(false);
                    this.getModel("detailView").setProperty("/busy", false);
                }.bind(this)
                }));
        },
        _getCurrentPeriod: function () {
            var nMinMth = this.formatter.returnDataFormat("yyyyMM").format(new Date([new Date().getFullYear(), new Date().getMonth() + 1, "01"].join("-"))),
                nMaxMth = this.formatter.returnDataFormat("yyyyMM").format(new Date([new Date().getFullYear(), new Date().getMonth() + 4, "01"].join("-")));
            return {
                nMinMth: +nMinMth,
                nMaxMth: +nMaxMth
            };
        },
        _returnMthDist: function (Object) {
            var nAssignedCap = +Object.AvailabilityInHours - +Object.PlndEffortQty;
            return {
                ...Object, ...{
                    WorkPackage: Object.WorkPackage,
                    Name: this.formatter.returnDataFormat("MMM yyyy").format(new Date([Object.YearMth.substr(0, 4), Object.YearMth.substr(4, 2), "01"].join("-"))),
                    YearMth: Object.YearMth,
                    // ResourceDemand: aProjRes[0].ResourceDemand,
                    // ResourceSupply: aProjRes[0].ResourceSupply,
                    // TimeRecordings: (aTimeRec.length > 0) ? +aTimeRec[0].RecordedQuantity : null,
                    // TimeRecordingsDay: (aTimeRec.length > 0 && aTimeRec[0].RecordedQuantity) ? +aTimeRec[0].RecordedQuantity / 8 : null,
                    Staffed: +Object.PlndEffortQty,
                    StaffedDay: (Object.PlndEffortQty) ? +Object.PlndEffortQty / 8 : null,
                    StaffedNew: (Object.nStaffedNew) ? +Object.nStaffedNew : null,
                    StaffedNewDay: (Object.nStaffedNew && +Object.nStaffedNew > 0) ? +Object.nStaffedNew / 8 : null,
                    UnassignedCap: nAssignedCap,
                    UnassignedCapDay: (nAssignedCap) || (nAssignedCap !== 0) ? nAssignedCap / 8 : null,
                    bLink: Object.bLink,
                    bInputVisible: Object.bInputVisible
                }
            }
        },
        _calculateValues: function (nodeLine) {
            nodeLine.Staffed = nodeLine.Node.map((o) => o.Staffed).reduce((prev, curr) => +prev + +curr, 0);
            nodeLine.Staffed = (nodeLine.Staffed > 0) ? nodeLine.Staffed : null;
            nodeLine.StaffedDay = (nodeLine.Staffed > 0) ? nodeLine.Staffed / 8 : null;
            nodeLine.StaffedNew = nodeLine.Node.map((o) => o.StaffedNew).reduce((prev, curr) => +prev + +curr, 0);
            nodeLine.StaffedNew = (nodeLine.StaffedNew > 0) ? nodeLine.StaffedNew : null;
            nodeLine.StaffedNewDay = (nodeLine.StaffedNew > 0) ? nodeLine.StaffedNew / 8 : null;
            nodeLine.UnassignedCap = nodeLine.Node.map((o) => o.UnassignedCap).reduce((prev, curr) => +prev + +curr, 0);
            nodeLine.UnassignedCapDay = (nodeLine.UnassignedCap !== 0) ? nodeLine.UnassignedCap / 8 : null;
        }
    });
});