sap.ui.define(
    ["sap/fe/core/AppComponent", "sap/ui/core/Messaging"],
    function (Component, Messaging) {
        "use strict";

    "use strict";

        // Create-dialog field labels come from Common.Label. Backend still sends hardcoded
        // English for these three properties (unlike ValidFrom etc. which already use
        // {i18n>Key}). Local annotation {@i18n>/i18n>} is not resolved by the create dialog,
        // so we translate the visible labels when the dialog renders.
        var CREATE_DIALOG_LABELS = [
            {
                key: "AirlineCode",
                patterns: ["{@i18n>AirlineCode}", "{i18n>AirlineCode}"]
            },
            {
                key: "LoadingDefinitionType",
                patterns: ["{@i18n>LoadingDefinitionType}", "{i18n>LoadingDefinitionType}"]
            },
            {
                key: "AcsPri",
                patterns: ["{@i18n>AcsPri}", "{i18n>AcsPri}"]
            },
            {
                key: "SpecTagCategory",
                patterns: ["{@i18n>SpecTagCategory}", "{i18n>SpecTagCategory}"]
            }
        ];

        return Component.extend("com.cathaydining.zppe024.Component", {
            metadata: {
                manifest: "json"
            },

            init: function () {
                Component.prototype.init.apply(this, arguments);
                this._hookCreateDialogLabels();
                // FE always throws this on save failure (console). zppe024 also puts it into
                // the MessagePopover when unbound General errors exist — strip it so UX
                // matches equispec / ldgtemp (field errors only in the popover).
                this._hookSuppressInconsistencySummary();
            },

            /**
             * Removes FE summary "Resolve data inconsistencies to save changes" from the
             * message model when other business/field errors are already present.
             * @private
             */
            _hookSuppressInconsistencySummary: function () {
                if (this._bInconsistencySummaryHooked) {
                    return;
                }
                this._bInconsistencySummaryHooked = true;

                var oMessageModel = Messaging.getMessageModel();
                oMessageModel.bindList("/").attachChange(function () {
                    if (this._bSuppressingInconsistencySummary) {
                        return;
                    }
                    var aMessages = oMessageModel.getData();
                    if (!Array.isArray(aMessages) || !aMessages.length) {
                        return;
                    }

                    var aSummary = [];
                    var iOtherErrors = 0;
                    aMessages.forEach(function (oMessage) {
                        var sText = oMessage.message || "";
                        var sType = oMessage.type || "";
                        if (this._isFeInconsistencySummary(sText)) {
                            aSummary.push(oMessage);
                        } else if (sType === "Error") {
                            iOtherErrors++;
                        }
                    }.bind(this));

                    if (!aSummary.length || !iOtherErrors) {
                        return;
                    }

                    this._bSuppressingInconsistencySummary = true;
                    try {
                        Messaging.removeMessages(aSummary);
                    } finally {
                        this._bSuppressingInconsistencySummary = false;
                    }
                }.bind(this));
            },

            /**
             * @param {string} sText Message text
             * @returns {boolean} true for the FE save-inconsistency summary
             * @private
             */
            _isFeInconsistencySummary: function (sText) {
                if (!sText) {
                    return false;
                }
                if (/resolve data inconsistenc/i.test(sText)) {
                    return true;
                }
                if (/数据不一致/.test(sText) && /保存/.test(sText)) {
                    return true;
                }
                if (/資料不一致/.test(sText) && (/儲存/.test(sText) || /保存/.test(sText))) {
                    return true;
                }
                return false;
            },

            /**
             * Patches Dialog rendering so create-dialog field labels follow the app language.
             * @private
             */
            _hookCreateDialogLabels: function () {
                if (sap.m.Dialog.prototype._zppe025CreateLabelHooked) {
                    return;
                }
                sap.m.Dialog.prototype._zppe025CreateLabelHooked = true;

                var oComponent = this;
                var fnOriginal = sap.m.Dialog.prototype.onAfterRendering;
                sap.m.Dialog.prototype.onAfterRendering = function () {
                    if (typeof fnOriginal === "function") {
                        fnOriginal.apply(this, arguments);
                    }
                    oComponent._translateCreateDialogLabels(this);
                };
            },

            /**
             * Replaces known English / unresolved i18n placeholders with translated texts.
             * @param {sap.m.Dialog} oDialog Dialog instance
             * @private
             */
            _translateCreateDialogLabels: function (oDialog) {
                var oBundle = this._getI18nBundle();
                if (!oBundle || !oDialog || oDialog.bIsDestroyed) {
                    return;
                }

                var aControls = oDialog.findAggregatedObjects(true, function (oControl) {
                    return typeof oControl.getText === "function"
                        && typeof oControl.setText === "function";
                });

                aControls.forEach(function (oControl) {
                    var sText = oControl.getText();
                    if (!sText) {
                        return;
                    }
                    var sTranslated = this._translateLabelText(sText, oBundle);
                    if (sTranslated && sTranslated !== sText) {
                        oControl.setText(sTranslated);
                    }
                }.bind(this));

                // mdc.Field / FormElement often keep the label as a property, not as Label text
                oDialog.findAggregatedObjects(true, function (oControl) {
                    return typeof oControl.getLabel === "function"
                        && typeof oControl.setLabel === "function";
                }).forEach(function (oControl) {
                    var vLabel = oControl.getLabel();
                    if (typeof vLabel !== "string" || !vLabel) {
                        return;
                    }
                    var sTranslated = this._translateLabelText(vLabel, oBundle);
                    if (sTranslated && sTranslated !== vLabel) {
                        oControl.setLabel(sTranslated);
                    }
                }.bind(this));
            },

            /**
             * Maps a raw label (optional trailing ":" / "*") to the translated text.
             * @param {string} sText Raw label
             * @param {sap.base.i18n.ResourceBundle} oBundle i18n bundle
             * @returns {string|null} Translated label or null when unchanged
             * @private
             */
            _translateLabelText: function (sText, oBundle) {
                var sTrimmed = String(sText).trim();
                var sSuffix = "";
                var oSuffixMatch = sTrimmed.match(/(:\s*)(\*)?\s*$/);
                if (oSuffixMatch) {
                    sSuffix = (oSuffixMatch[1] || "") + (oSuffixMatch[2] || "");
                    sTrimmed = sTrimmed.slice(0, sTrimmed.length - oSuffixMatch[0].length).trim();
                }

                for (var i = 0; i < CREATE_DIALOG_LABELS.length; i++) {
                    var oEntry = CREATE_DIALOG_LABELS[i];
                    if (oEntry.patterns.indexOf(sTrimmed) >= 0) {
                        return oBundle.getText(oEntry.key) + sSuffix;
                    }
                }
                return null;
            },

            /**
             * @returns {sap.base.i18n.ResourceBundle|null} App i18n bundle
             * @private
             */
            _getI18nBundle: function () {
                var oModel = this.getModel("i18n") || this.getModel("@i18n");
                return oModel && oModel.getResourceBundle ? oModel.getResourceBundle() : null;
            }
        });
    }
);