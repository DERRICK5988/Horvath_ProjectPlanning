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
    "sap/m/library"
], function (BaseController, JSONModel, Filter, FilterOperator, Sorter, MessagePopover, MessagePopoverItem, MessageBox, FormattedText, mobileLibrary) {
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
                totalUnassignCap: 30,
                selectedView: "HOUR"
            });
            debugger;
            this.getView().setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");
            sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);
            this.getRouter().getRoute("list").attachPatternMatched(this._onObjectMatched, this);
            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
            this.getRouter().getRoute("detailDetail").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "detailView");
            this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Event handler when the share by E-Mail button has been clicked
         * @public
         */
        onSendEmailPress: function () {
            var oViewModel = this.getModel("detailView");

            URLHelper.triggerEmail(
                null,
                oViewModel.getProperty("/shareSendEmailSubject"),
                oViewModel.getProperty("/shareSendEmailMessage")
            ); getRoute
        },
        onChange: function (oEvent) {
            var oSource = oEvent.getSource(),
                // oContext = oSource.getBindingInfo("value").binding.getContext(),
                oContext = oSource.getBindingInfo("value").binding.aBindings[0].getContext(),
                sPath = oContext.sPath,
                aChangedSPath = oEvent.getSource().getModel("detailView").getProperty("/aChangedSPath");
            if (!oEvent.getParameter("newValue") && aChangedSPath.length > 0) {
                var indexObj = aChangedSPath.findIndex(object => { return object.sPath === sPath; })
                aChangedSPath.splice(indexObj, 1);
                // oEvent.getSource().getModel("detailView").refresh(true);
                return;
            }
            // var bExist = aChangedSPath.some(obj => obj.sPath === sPath)
            // if (bExist) {
            //     return;
            // }
            var aChanged = aChangedSPath.filter(obj => obj.sPath === sPath);
            if (aChanged.length > 0) {
                aChanged[0].value = oEvent.getParameter("newValue");
                return;
            }
            aChangedSPath.push({ sPath: sPath, value: oEvent.getParameter("newValue") });
            // oEvent.getSource().getModel("detailView").refresh();
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
        onEmployeePress: function (oEvent) {
            debugger;
            this.getOwnerComponent().getRouter().navTo("detailDetail", { supplier: "" });
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
        // _onObjectMatched: function (oEvent) {
        //     debugger;
        //     var sObjectId = oEvent.getParameter("arguments").objectId;
        //     this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
        //     this.getModel().metadataLoaded().then(function () {
        //         var sObjectPath = this.getModel().createKey("ProjectSet", {
        //             ProjectID: sObjectId
        //         });
        //         this._bindView("/" + sObjectPath);
        //     }.bind(this));
        // },
        _onObjectMatched: function (oEvent) {
            debugger;
            var oArguments = oEvent.getParameter("arguments"),
                oContextObj = JSON.parse(oArguments.object),
                oParam = { "$expand": "PlanDataSet,PlanDataSet/ToStaffData" },
                aFilter = [],
                aSorts = [],
                aComFilter = [];
            sap.ui.getCore().getMessageManager().removeAllMessages();
            this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            this.getModel("detailView").setData(Object.assign(this.getModel("detailView").getData(), oContextObj,
                {
                    StartDate: new Date(oContextObj.StartDate),
                    EndDate: new Date(oContextObj.EndDate)
                }));
            this.getModel("detailView").setProperty("/busy", true);
            aComFilter.push(new Filter("EngagementProject", FilterOperator.EQ, oContextObj.ProjectID));
            aFilter.push(new Filter("ProjectID", FilterOperator.EQ, oContextObj.ProjectID));
            Promise.all([
                this._fetchResources(this.getView().getModel(), "/WorkpackageSet", aFilter, oParam, "", [new Sorter("WorkPackageID", false)]),
                this._fetchResources(this.getView().getModel(), "/StaffingDataSet", aFilter),
                this._fetchResources(this.getOwnerComponent().getModel("PROJ_ENGMT_UPDATE_SRV"), "/A_EngmntProjRsceSup", aComFilter),
                this._fetchResources(this.getView().getModel("TimeSheet"), "/YY1_TIMERECORDING", aFilter)
            ]).then(function (oResp) {
                var oTreeData = { Node: [] },
                    oDetailModel = this.getModel("detailView"),
                    aStaffData = oResp[1].results,
                    aProjEng = oResp[2].results,
                    oCurrPeriod = this._getCurrentPeriod();
                oDetailModel.setProperty("/resourcesCount", oResp[0].results.length);
                for (var wpIndex in oResp[0].results) {
                    // Workpackage level
                    var oWpItem = oResp[0].results[wpIndex],
                        nBaseLine = aProjEng.filter((a) => { if (a.Version === "2" && a.WorkPackage === oWpItem.WorkPackageID) { return a } }).
                            map((m) => m.Quantity).reduce((prev, curr) => +prev + +curr, 0);
                    oTreeData.Node.push({
                        Name: [oWpItem.WorkPackageName, oWpItem.WorkPackageID].join(" "),
                        Baseline: (nBaseLine > 0) ? nBaseLine : null,
                        Employee: false,
                        inputVisible: false,
                        Node: []
                    });
                    if (aStaffData.length === 0) { continue; }
                    // Employee Level
                    var aStaff = [];
                    // Remove duplication
                    aStaff = aStaffData.filter(
                        (item, index) => index === aStaffData.findIndex(
                            other => item.StaffedEmployee === other.StaffedEmployee && item.WorkPackageID === other.WorkPackageID
                        ));
                    for (var stfIndex in aStaff) {
                        var oStaff = aStaff[stfIndex],
                            aEmpNode = oTreeData.Node[wpIndex].Node;
                        if (oStaff.WorkPackageID !== oWpItem.WorkPackageID) {
                            continue;
                        }
                        // Staffed
                        var aFilStaff = aStaffData.filter(function (i) {
                            if (i.WorkPackageID === oStaff.WorkPackageID && i.StaffedEmployee === oStaff.StaffedEmployee) { return i }
                        });
                        var nStaffed = aFilStaff.filter(function (a) { if (a.Version === "1") { return a } }).
                            map(function (o) { return o.StaffedEffort }).reduce((prev, curr) => +prev + +curr, 0);
                        var oWpNodeLine = oTreeData.Node[oTreeData.Node.length - 1];
                        oWpNodeLine.Staffed = (nStaffed) ? +((oWpNodeLine.Staffed) ? oWpNodeLine.Staffed : 0) + +nStaffed : oWpNodeLine.Staffed;
                        aEmpNode.push(Object.assign(oStaff, {
                            Name: oStaff.StaffedEmployeeName,
                            Staffed: nStaffed,
                            StaffedDay: (nStaffed) ? nStaffed / 8 : nStaffed,
                            Employee: true,
                            inputVisible: false,
                            Node: []
                        }));
                        // Get resource demand
                        var aProjRes = aProjEng.filter((a) => {
                            if (a.Version === "1" && a.WorkPackage === oWpItem.WorkPackageID && a.PersonWorkAgreement === oStaff.StaffedEmployee) { return a }
                        }),
                            oEmpNodeLine = aEmpNode[aEmpNode.length - 1];
                        // Monthly Distribution Hours
                        for (var indexMth in aFilStaff) {
                            var oDist = aFilStaff[indexMth],
                                aTimeRec = oResp[3].results.filter(function (obj) {
                                    if (obj.MthYr === oDist.FcYear + oDist.Period.substring(1) && obj.WorkPackageID === oStaff.WorkPackageID) { return obj }
                                });
                            if (+[oDist.FcYear, oDist.Period.substring(1)].join("") < oCurrPeriod.nMinMth) {
                                if (oEmpNodeLine.Node.filter((i) => (i.preMth)).length === 0) {
                                    oEmpNodeLine.Node.push({ Name: "Sum of previous months", preMth: true, Employee: false, inputVisible: false, Node: [] });
                                }
                                var preMthLines = oEmpNodeLine.Node.filter((i) => (i.preMth)),
                                    oPreNode = preMthLines[0].Node,
                                    nStaffedNew = (aTimeRec.length > 0) ? +aTimeRec[0].RecordedQuantity : null;
                                oPreNode.push(this._returnMthDist(oWpItem, oDist, aProjRes, aTimeRec, nStaffedNew, false, false));
                            }
                            else if (+[oDist.FcYear, oDist.Period.substring(1)].join("") > oCurrPeriod.nMaxMth) {
                                if (oEmpNodeLine.Node.filter((i) => (i.upcomMth)).length === 0) {
                                    oEmpNodeLine.Node.push({ Name: "Sum of upcoming months", upcomMth: true, Employee: false, inputVisible: false, Node: [] });
                                }
                                var upComMthLines = oEmpNodeLine.Node.filter((i) => (i.upcomMth)),
                                    oUpcomNode = upComMthLines[0].Node,
                                    nStaffedNew = (oDist.Version === "1") ? +oDist.StaffedEffort : null;
                                oUpcomNode.push(this._returnMthDist(oWpItem, oDist, aProjRes, aTimeRec, nStaffedNew, false, true));
                            } else {
                                // var curMthLines = oEmpNodeLine.Node.filter((i) => (i.currMth)),
                                //     oCurrNode = curMthLines[0].Node,
                                var nStaffedNew = (aTimeRec.length > 0 && +[oDist.FcYear, oDist.Period.substring(1)].join("") === oCurrPeriod.nMinMth) ? +aTimeRec[0].RecordedQuantity
                                    : (oDist.Version === "1" && +[oDist.FcYear, oDist.Period.substring(1)].join("") !== oCurrPeriod.nMinMth) ? +oDist.StaffedEffort : null;
                                // binputVisible = (+[oDist.FcYear, oDist.Period.substring(1)].join("") === oCurrPeriod.nMinMth) ? false : true;
                                oEmpNodeLine.Node.push(this._returnMthDist(oWpItem, oDist, aProjRes, aTimeRec, nStaffedNew, false, true));
                            }
                            oEmpNodeLine.TimeRecordings = (aTimeRec.length > 0) ? +((oEmpNodeLine.TimeRecordings) ? oEmpNodeLine.TimeRecordings : 0) + +aTimeRec[0].RecordedQuantity : oEmpNodeLine.TimeRecordings;
                            // oEmpNodeLine.StaffedNew = (oEmpNodeLine.StaffedNew > 0 && nStaffedNew) ? +oEmpNodeLine.StaffedNew + +nStaffedNew : nStaffedNew;
                        };
                        debugger;
                        // Sum of periods
                        if (oPreNode && oPreNode.length > 0) {
                            this._sumPeriodDist(preMthLines, oPreNode);
                        }
                        if (oUpcomNode && oUpcomNode.length > 0) {
                            this._sumPeriodDist(upComMthLines, oUpcomNode);
                        }
                        oEmpNodeLine.StaffedNew = oEmpNodeLine.Node.map(function (o) { return o.StaffedNew }).reduce((prev, curr) => +prev + +curr, 0);
                        oEmpNodeLine.StaffedNew = (oEmpNodeLine.StaffedNew) ? oEmpNodeLine.StaffedNew : null;
                        oEmpNodeLine.StaffedNewDay = (oEmpNodeLine.StaffedNew > 0) ? oEmpNodeLine.StaffedNew / 8 : oEmpNodeLine.StaffedNew;
                        oWpNodeLine.StaffedNew = (oEmpNodeLine.StaffedNew > 0) ? +(oWpNodeLine.StaffedNew ? oWpNodeLine.StaffedNew : 0) + +oEmpNodeLine.StaffedNew : oWpNodeLine.StaffedNew;
                        oEmpNodeLine.TimeRecordingsDay = (oEmpNodeLine.TimeRecordings > 0) ? oEmpNodeLine.TimeRecordings / 8 : oEmpNodeLine.TimeRecordings;
                        oWpNodeLine.TimeRecordings = (oEmpNodeLine.TimeRecordings > 0) ? +(oWpNodeLine.TimeRecordings ? oWpNodeLine.TimeRecordings : 0) + +oEmpNodeLine.TimeRecordings : oWpNodeLine.TimeRecordings;
                        oEmpNodeLine.UnassignedCap = oEmpNodeLine.Node.map(function (o) { return o.UnassignedCap }).reduce((prev, curr) => +prev + +curr, 0);
                        oEmpNodeLine.UnassignedCapDay = (oEmpNodeLine.UnassignedCap > 0) ? oEmpNodeLine.UnassignedCap / 8 : oEmpNodeLine.UnassignedCap;
                    }
                    // Convert from Hour to Day [WorkPackage level]
                    oWpNodeLine.StaffedDay = (oWpNodeLine.Staffed > 0) ? oWpNodeLine.Staffed / 8 : oWpNodeLine.Staffed;
                    oWpNodeLine.StaffedNewDay = (oWpNodeLine.StaffedDay > 0) ? oWpNodeLine.StaffedDay / 8 : oWpNodeLine.StaffedDay;
                    oWpNodeLine.TimeRecordingsDay = (oWpNodeLine.TimeRecordings) ? +oWpNodeLine.TimeRecordings / 8 : oWpNodeLine.TimeRecordings;
                    oWpNodeLine.BaselineDay = (oWpNodeLine.Baseline > 0) ? oWpNodeLine.Baseline / 8 : oWpNodeLine.Baseline;
                }
                this.getView().getModel("detailView").setProperty("/resource", oTreeData);
                this.getView().getModel("detailView").refresh(true);
                this.getModel("detailView").setProperty("/busy", false);
                // this.byId("idTreeTable").autoResizeColumn();
            }.bind(this)).catch(function (oErr) { this.getModel("detailView").setProperty("/busy", false); }.bind(this));
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

            oViewModel.setProperty("/shareSendEmailSubject",
                oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
            oViewModel.setProperty("/shareSendEmailMessage",
                oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
        },

        _onMetadataLoaded: function () {
            // // Store original busy indicator delay for the detail view
            // var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
            //     oViewModel = this.getModel("detailView"),
            //     oLineItemTable = this.byId("lineItemsList"),
            //     iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

            // // Make sure busy indicator is displayed immediately when
            // // detail view is displayed for the first time
            // oViewModel.setProperty("/delay", 0);
            // oViewModel.setProperty("/lineItemTableDelay", 0);

            // oLineItemTable.attachEventOnce("updateFinished", function () {
            //     // Restore original busy indicator delay for line item table
            //     oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
            // });

            // // Binding the view will set it to not busy - so the view is always busy if it is not bound
            // oViewModel.setProperty("/busy", true);
            // // Restore original busy indicator delay for the detail view
            // oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
        },

        /**
         * Set the full screen mode to false and navigate to list page
         */
        onCloseDetailPress: function () {
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
            // No item should be selected on list after detail page is closed
            this.getOwnerComponent().oListSelector.clearListListSelection();
            this.getRouter().navTo("list");
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
                this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
            }
        },
        _updateModel: function () {

            var oProjModel = this.getModel("PROJ_ENGMT_UPDATE_SRV"),
                oDetailModel = this.getView().getModel("detailView"),
                aChangedSPath = oDetailModel.getProperty("/aChangedSPath");
            if (aChangedSPath.length === 0) {
                return;
            }
            oProjModel.setDeferredGroups(["BatchQuery"]);
            this.getModel("detailView").setProperty("/busy", true);
            for (var index in aChangedSPath) {
                var oChanged = aChangedSPath[index],
                    oContext = this.getModel("detailView").getProperty(aChangedSPath[index].sPath),
                    object = {};
                object.oModel = oProjModel;
                object.sKey = oProjModel.createKey("/A_EngmntProjRsceDmndDistr", {
                    WorkPackage: oContext.WorkPackage,
                    ResourceDemand: oContext.ResourceDemand,
                    Version: '1',
                    CalendarMonth: oContext.CalendarMonth,
                    CalendarYear: oContext.CalendarYear
                });
                object.oPayload = {
                    UnitOfMeasure: "H",
                    Quantity: (oDetailModel.getProperty("/selectedView") === "DAY") ? (oChanged.value * 8).toString() : (oChanged.value).toString()
                    // Quantity: (oDetailModel.getProperty("/selectedView") === "DAY") ? (oContext.StaffedNew * 8).toString() : (oContext.StaffedNew).toString()
                };
                object.mParameters = { "groupId": "BatchQuery", "changeSetId": "BatchQuery", "method": "PATCH" }
                this.updateModel(object);
            }
            oProjModel.submitChanges(Object.assign(object.mParameters, {
                success: function (oResp) {
                    var oMsgModel = this.getModel("message"),
                        aChangedSPath = this.getModel("detailView").getProperty("/aChangedSPath");
                    if (oMsgModel.getData()[0].type !== "Success") {
                        for (var idx in aChangedSPath) {
                            this.getModel("PROJ_ENGMT_UPDATE_SRV").resetChanges([aChangedSPath[idx].sPath], true);
                        }
                        this.getModel("detailView").setProperty("/busy", false);
                        return;
                    }
                    this.getModel("detailView").setProperty("/aChangedSPath", [])
                    // Run fetch resource
                    this.getModel("detailView").setProperty("/busy", false);
                    // this.getModel("detailView").refresh(true);
                }.bind(this),
                error: function (oErr) {
                    this.getModel("detailView").setProperty("/busy", false);
                }.bind(this)
            }));
        },
        _fetchResources: function (oModel, sPath, aFilters, oParams, groupId, aSort) {
            // @ts-ignore
            return new Promise(
                function (resolve, reject) {
                    oModel.read(sPath, {
                        filters: aFilters,
                        sorters: aSort,
                        urlParameters: oParams,
                        groupId: groupId,
                        // @ts-ignore
                        success: function (oData, oResponse) {
                            resolve(oData);
                        }.bind(this),
                        error: function (error) {
                            reject(error);
                        }.bind(this)
                    });
                });
        },
        _getCurrentPeriod: function () {
            var nMinMth = this.returnDataFormat("yyyyMM").format(new Date([new Date().getFullYear(), new Date().getMonth(), "01"].join("-"))),
                nMaxMth = this.returnDataFormat("yyyyMM").format(new Date([new Date().getFullYear(), new Date().getMonth() + 3, "01"].join("-")));
            return { nMinMth: +nMinMth, nMaxMth: +nMaxMth };
        },
        _returnMthDist: function (oWpItem, oDist, aProjRes, aTimeRec, nStaffedNew, bEmployee, binputVisible) {
            // Temporary
            var nUnassign = +((Math.random() * 10) + -5),
                nUnassignDay = (nUnassign) ? nUnassign / 8 : null;
            return {
                WorkPackage: oWpItem.WorkPackageID,
                Name: this.returnDataFormat("MMM yyyy").format(new Date([oDist.FcYear, oDist.Period, "01"].join("-"))),
                CalendarMonth: oDist.Period,
                CalendarYear: oDist.FcYear,
                ResourceDemand: aProjRes[0].ResourceDemand,
                ResourceSupply: aProjRes[0].ResourceSupply,
                TimeRecordings: (aTimeRec.length > 0) ? +aTimeRec[0].RecordedQuantity : null,
                TimeRecordingsDay: (aTimeRec.length > 0 && aTimeRec[0].RecordedQuantity) ? +aTimeRec[0].RecordedQuantity / 8 : null,
                Staffed: (oDist.Version === "1") ? +oDist.StaffedEffort : null,
                StaffedDay: (oDist.Version === "1" && oDist.StaffedEffort) ? +oDist.StaffedEffort / 8 : null,
                StaffedNew: nStaffedNew,
                StaffedNewDay: (nStaffedNew) ? nStaffedNew / 8 : null,
                UnassignedCap: nUnassign,
                UnassignedCapDay: nUnassignDay,
                Employee: bEmployee,
                inputVisible: binputVisible
            }
        },
        _sumPeriodDist: function (object, oNode) {
            object[0].Staffed = oNode.map(function (o) { return o.Staffed }).reduce((prev, curr) => +prev + +curr, 0);
            object[0].Staffed = (object[0].Staffed) ? object[0].Staffed : null;
            object[0].StaffedDay = (object[0].StaffedDay) ? object[0].StaffedDay / 8 : object[0].StaffedDay;
            object[0].StaffedNew = oNode.map(function (o) { return o.StaffedNew }).reduce((prev, curr) => +prev + +curr, 0);
            object[0].StaffedNew = (object[0].StaffedNew) ? object[0].StaffedNew : null;
            object[0].StaffedNewDay = (object[0].StaffedDay) ? object[0].StaffedDay / 8 : object[0].StaffedDay;
            object[0].TimeRecordings = oNode.map(function (o) { return o.TimeRecordings }).reduce((prev, curr) => +prev + +curr, 0);
            object[0].TimeRecordings = (object[0].TimeRecordings) ? object[0].TimeRecordings : null;
            object[0].TimeRecordingsDay = (object[0].TimeRecordings) ? object[0].TimeRecordings / 8 : null;
            object[0].UnassignedCap = oNode.map(function (o) { return o.UnassignedCap }).reduce((prev, curr) => +prev + +curr, 0);
            object[0].UnassignedCap = (object[0].UnassignedCap) ? object[0].UnassignedCap / 8 : null;
            object[0].UnassignedCapDay = (object[0].UnassignedCapDay) ? object[0].UnassignedCapDay / 8 : null;
        }
    });

});