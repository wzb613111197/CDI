sap.ui.define([
    "sap/ui/mdc/odata/v4/TableDelegate",
    "sap/ui/mdc/table/Column",
    "sap/m/Input",
    "sap/m/Text",
    "sap/m/Link"
], function (TableDelegate, Column, Input, Text, Link) {
    "use strict";

    var EquipmentAssignmentTableDelegate = Object.assign({}, TableDelegate);

    var aNumericEdmTypes = [
        "Edm.Byte", "Edm.SByte", "Edm.Int16", "Edm.Int32", "Edm.Int64",
        "Edm.Single", "Edm.Double", "Edm.Decimal"
    ];

    // Immutable properties (e.g. key fields such as Matnr) can only be filled
    // while the row is still transient, i.e. before the create request is sent.
    function formatImmutableEditable(sEditMode, bTransient) {
        return sEditMode === "Editable" && !!bTransient;
    }

    // fetchProperties is inherited from the V4 TableDelegate:
    // property metadata (labels, types) is read from the OData V4
    // metadata / CDS annotations of the entity set given in the
    // delegate payload "collectionPath".

    EquipmentAssignmentTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        TableDelegate.updateBindingInfo.call(this, oTable, oBindingInfo);

        // Bind the rows relatively through the parent navigation property
        // (e.g. "_LoadEq" / "_ServEq"). The table's binding context is the
        // selected ZC_PP_LDGTEMP_MIT context, so creates go through the
        // RAP create-by-association and participate in the draft.
        var oPayload = oTable.getPayload() || {};
        if (oPayload.navPath) {
            oBindingInfo.path = oPayload.navPath;
        }
        // Queue creates/deletes/property changes in a dedicated update group
        // so they are only sent on explicit submitBatch (Confirm) and can be
        // discarded via resetChanges (Cancel). V4 binding parameters live
        // under "parameters" with a $$ prefix.
        if (oPayload.updateGroupId) {
            oBindingInfo.parameters = oBindingInfo.parameters || {};
            oBindingInfo.parameters.$$updateGroupId = oPayload.updateGroupId;
        }
    };

    /**
     * Builds the table columns from the UI.LineItem annotation of the entity
     * set given in the delegate payload ("collectionPath"). Adding a field to
     * the CDS @UI.lineItem annotation is therefore enough to make it appear
     * here, no change to the fragment is needed.
     *
     * Editability is derived from the annotations as well:
     *   Core.Computed   -> never editable, rendered as text
     *   Core.Immutable  -> editable only while the row is transient
     *   otherwise       -> editable whenever the page is in edit mode
     *
     * @param {sap.ui.mdc.Table} oTable the equipment assignment table
     * @param {object} oController the controller providing the event handlers
     */
    EquipmentAssignmentTableDelegate.createColumns = function (oTable, oController) {
        // Columns survive between dialog openings, only build them once.
        if (oTable.getColumns().length > 0) {
            return;
        }

        var oPayload = oTable.getPayload() || {};
        var oModel = oTable.getModel();
        var oMetaModel = oModel && oModel.getMetaModel();
        if (!oPayload.collectionPath || !oMetaModel) {
            return;
        }

        var aLineItem = oMetaModel.getObject(
            oPayload.collectionPath + "/@com.sap.vocabularies.UI.v1.LineItem") || [];
        // A trailing slash resolves the entity set to its entity type.
        var oEntityType = oMetaModel.getObject(oPayload.collectionPath + "/") || {};
        var aKeys = oEntityType.$Key || [];

        aLineItem.forEach(function (oDataField) {
            if (oDataField.$Type !== "com.sap.vocabularies.UI.v1.DataField" ||
                !oDataField.Value || !oDataField.Value.$Path) {
                return;
            }

            var sProperty = oDataField.Value.$Path;
            var sPropertyPath = oPayload.collectionPath + "/" + sProperty;

            var bComputed = !!oMetaModel.getObject(sPropertyPath + "@Org.OData.Core.V1.Computed");
            var bImmutable = !!oMetaModel.getObject(sPropertyPath + "@Org.OData.Core.V1.Immutable");
            var bHasValueHelp =
                !!oMetaModel.getObject(sPropertyPath + "@com.sap.vocabularies.Common.v1.ValueListReferences") ||
                !!oMetaModel.getObject(sPropertyPath + "@com.sap.vocabularies.Common.v1.ValueList");
            var sEdmType = oMetaModel.getObject(sPropertyPath + "/$Type");

            var oTemplate;
            if (bComputed) {
                oTemplate = new Text({ text: "{" + sProperty + "}" });
            } else {
                var mInputSettings = {
                    value: "{" + sProperty + "}"
                };
                if (bImmutable) {
                    mInputSettings.editable = {
                        parts: [{ path: "ui>/editMode" }, { path: "@$ui5.context.isTransient" }],
                        formatter: formatImmutableEditable
                    };
                } else {
                    mInputSettings.editable = "{= ${ui>/editMode} === 'Editable'}";
                }
                if (aNumericEdmTypes.indexOf(sEdmType) >= 0) {
                    mInputSettings.type = "Number";
                }
                if (bHasValueHelp && oController.onEquipmentMatnrValueHelp) {
                    mInputSettings.showValueHelp = true;
                    mInputSettings.valueHelpRequest =
                        oController.onEquipmentMatnrValueHelp.bind(oController);
                }
                oTemplate = new Input(mInputSettings);
            }

            oTable.addColumn(new Column({
                // The label is maintained as "{i18n>Key}" in the CDS
                // annotation, which is resolved as a binding here.
                header: oDataField.Label ||
                    oMetaModel.getObject(sPropertyPath + "@com.sap.vocabularies.Common.v1.Label") ||
                    sProperty,
                propertyKey: sProperty,
                required: aKeys.indexOf(sProperty) >= 0,
                template: oTemplate
            }));
        });

        // The row delete action is not part of the annotation.
        oTable.addColumn(new Column({
            header: "",
            width: "6rem",
            template: new Link({
                text: "{i18n>Remove}",
                enabled: "{= ${ui>/editMode} === 'Editable'}",
                press: oController.onEquipmentRemoveRow.bind(oController)
            })
        }));
    };

    return EquipmentAssignmentTableDelegate;
});
