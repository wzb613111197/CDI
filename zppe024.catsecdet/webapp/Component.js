sap.ui.define(
    [
        "sap/fe/core/AppComponent",
        "sap/m/MessageItem",
        "sap/m/FormattedText",
        "sap/m/Dialog"
    ],
    function (Component, MessageItem, FormattedText, Dialog) {
        "use strict";

        // FE MessageButton._formatMessageDescription calls MessageItem.setDescription with
        // HTML that still contains raw {@i18n>Key} from getTableColValue (no getLocalizedText).

        return Component.extend("com.cathaydining.zppe024.catsecdet.Component", {
            metadata: {
                manifest: "json"
            },

            init: function () {
                Component.prototype.init.apply(this, arguments);
                this._ensureI18nBundle().then(function () {
                    this._hookUnresolvedI18nLabels();
                    this._startDomI18nObserver();
                }.bind(this));
            },

            /**
             * Loads and caches the app i18n bundle (sync or async ResourceModel).
             * @returns {Promise} Resolves when bundle is ready
             * @private
             */
            _ensureI18nBundle: function () {
                var oModel = this.getModel("i18n") || this.getModel("@i18n");
                if (!oModel || !oModel.getResourceBundle) {
                    return Promise.resolve();
                }
                return Promise.resolve(oModel.getResourceBundle()).then(function (oBundle) {
                    this._oI18nBundle = oBundle;
                }.bind(this));
            },

            /**
             * @returns {sap.base.i18n.ResourceBundle|null} Cached i18n bundle
             * @private
             */
            _getI18nBundle: function () {
                if (this._oI18nBundle) {
                    return this._oI18nBundle;
                }
                var oModel = this.getModel("i18n") || this.getModel("@i18n");
                if (!oModel || !oModel.getResourceBundle) {
                    return null;
                }
                var vBundle = oModel.getResourceBundle();
                if (vBundle && typeof vBundle.then === "function") {
                    return null;
                }
                this._oI18nBundle = vBundle;
                return vBundle;
            },

            /**
             * Hooks MessageItem / FormattedText / Dialog so {@i18n>} is resolved.
             * @private
             */
            _hookUnresolvedI18nLabels: function () {
                if (MessageItem.prototype._zppe025I18nDescHooked) {
                    return;
                }
                MessageItem.prototype._zppe025I18nDescHooked = true;

                var oComponent = this;

                // Field Affected HTML is written here (MessageItem, not core Message)
                var fnSetDescription = MessageItem.prototype.setDescription;
                MessageItem.prototype.setDescription = function (sDescription) {
                    if (typeof sDescription === "string" && sDescription.indexOf("i18n>") >= 0) {
                        sDescription = oComponent._replaceI18nPlaceholders(sDescription);
                    }
                    return fnSetDescription.call(this, sDescription);
                };

                var fnSetSubtitle = MessageItem.prototype.setSubtitle;
                MessageItem.prototype.setSubtitle = function (sSubtitle) {
                    if (typeof sSubtitle === "string" && sSubtitle.indexOf("i18n>") >= 0) {
                        sSubtitle = oComponent._replaceI18nPlaceholders(sSubtitle);
                    }
                    return fnSetSubtitle.call(this, sSubtitle);
                };

                var fnSetHtmlText = FormattedText.prototype.setHtmlText;
                FormattedText.prototype.setHtmlText = function (sHtml) {
                    if (typeof sHtml === "string" && sHtml.indexOf("i18n>") >= 0) {
                        sHtml = oComponent._replaceI18nPlaceholders(sHtml);
                    }
                    return fnSetHtmlText.call(this, sHtml);
                };

                var fnDialogAfter = Dialog.prototype.onAfterRendering;
                Dialog.prototype.onAfterRendering = function () {
                    if (typeof fnDialogAfter === "function") {
                        fnDialogAfter.apply(this, arguments);
                    }
                    oComponent._translateUnresolvedI18nInControl(this);
                    oComponent._translateI18nInDom(this.getDomRef && this.getDomRef());
                };
            },

            /**
             * Last-resort: replace {@i18n>} text nodes under the open dialog/body.
             * @private
             */
            _startDomI18nObserver: function () {
                if (this._oDomI18nObserver || typeof MutationObserver === "undefined" || !document.body) {
                    return;
                }
                var oComponent = this;
                this._oDomI18nObserver = new MutationObserver(function () {
                    if (document.body && document.body.innerHTML.indexOf("i18n>") >= 0) {
                        oComponent._translateI18nInDom(document.body);
                    }
                });
                this._oDomI18nObserver.observe(document.body, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            },

            /**
             * Walks DOM text nodes and replaces i18n placeholders.
             * @param {Element|null} oRoot Dom root
             * @private
             */
            _translateI18nInDom: function (oRoot) {
                if (!oRoot || !this._getI18nBundle()) {
                    return;
                }
                var oWalker = document.createTreeWalker(oRoot, NodeFilter.SHOW_TEXT, null);
                var oNode = oWalker.nextNode();
                while (oNode) {
                    var sValue = oNode.nodeValue;
                    if (sValue && sValue.indexOf("i18n>") >= 0) {
                        var sNew = this._replaceI18nPlaceholders(sValue);
                        if (sNew !== sValue) {
                            oNode.nodeValue = sNew;
                        }
                    }
                    oNode = oWalker.nextNode();
                }
            },

            /**
             * Replaces unresolved i18n placeholders under a control tree.
             * @param {sap.ui.core.Control} oRoot Root control
             * @private
             */
            _translateUnresolvedI18nInControl: function (oRoot) {
                if (!this._getI18nBundle() || !oRoot || oRoot.bIsDestroyed) {
                    return;
                }

                oRoot.findAggregatedObjects(true, function (oControl) {
                    return typeof oControl.getText === "function"
                        && typeof oControl.setText === "function";
                }).forEach(function (oControl) {
                    var sText = oControl.getText();
                    if (!sText || sText.indexOf("i18n>") < 0) {
                        return;
                    }
                    var sTranslated = this._replaceI18nPlaceholders(sText);
                    if (sTranslated !== sText) {
                        oControl.setText(sTranslated);
                    }
                }.bind(this));

                oRoot.findAggregatedObjects(true, function (oControl) {
                    return typeof oControl.getLabel === "function"
                        && typeof oControl.setLabel === "function";
                }).forEach(function (oControl) {
                    var vLabel = oControl.getLabel();
                    if (typeof vLabel !== "string" || vLabel.indexOf("i18n>") < 0) {
                        return;
                    }
                    var sTranslated = this._replaceI18nPlaceholders(vLabel);
                    if (sTranslated !== vLabel) {
                        oControl.setLabel(sTranslated);
                    }
                }.bind(this));

                oRoot.findAggregatedObjects(true, function (oControl) {
                    return oControl.isA && oControl.isA("sap.m.FormattedText")
                        && typeof oControl.getHtmlText === "function"
                        && typeof oControl.setHtmlText === "function";
                }).forEach(function (oControl) {
                    var sHtml = oControl.getHtmlText();
                    if (!sHtml || sHtml.indexOf("i18n>") < 0) {
                        return;
                    }
                    var sTranslated = this._replaceI18nPlaceholders(sHtml);
                    if (sTranslated !== sHtml) {
                        oControl.setHtmlText(sTranslated);
                    }
                }.bind(this));
            },

            /**
             * Replaces {@i18n>key} / {i18n>key} anywhere in the string.
             * @param {string} sText Raw text or HTML
             * @returns {string} Text with placeholders replaced when keys exist
             * @private
             */
            _replaceI18nPlaceholders: function (sText) {
                var oBundle = this._getI18nBundle();
                if (!oBundle || !sText) {
                    return sText;
                }
                return String(sText).replace(/\{@?i18n>([^}]+)\}/g, function (sMatch, sKey) {
                    var sTranslated = oBundle.getText(sKey);
                    return sTranslated && sTranslated !== sKey ? sTranslated : sMatch;
                });
            }
        });
    }
);
