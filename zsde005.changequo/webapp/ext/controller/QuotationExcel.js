sap.ui.define([], function () {
    "use strict";

    /**
     * Shared Excel column contract for changequo / createquo / uploaduptquo / uploadnewquo.
     * labels: [en, zh_CN, zh_TW] used as export headers; aliases accepted on import.
     * Customer Code -> Customer; Status -> QTStatus (createquo qdColStatus).
     */
    var aColumns = [
        { property: "Quotation", type: "string", labels: ["Quotation", "报价单", "報價單"] },
        { property: "QTType", type: "string", labels: ["Quotation Type", "报价单类型", "報價單類型"] },
        { property: "Item", type: "string", labels: ["Item no", "行项目号", "行項目號"] },
        { property: "DeleteFlag", type: "boolean", labels: ["Delete Flag", "删除标记", "刪除標記"] },
        { property: "ComponentID", type: "string", labels: ["Component ID", "组件ID", "組件ID"] },
        { property: "SalesOrg", type: "string", labels: ["Sales Org", "销售组织", "銷售組織"] },
        { property: "DistChannel", type: "string", labels: ["Distribution Channel", "分销渠道", "分銷渠道"] },
        { property: "Division", type: "string", labels: ["Division", "产品组", "產品組"] },
        { property: "HeaderDesc", type: "string", labels: ["Quotation Header Description", "报价单抬头描述", "報價單抬頭描述"] },
        { property: "Customer", type: "string", labels: ["Customer Code", "客户代码", "客戶代碼"], aliases: ["客户编码"] },
        { property: "AirlineCode", type: "string", labels: ["Airline Code", "航空公司代码", "航空公司代碼"] },
        { property: "LoadingTempCode", type: "string", labels: ["Loading Template", "装载模板", "裝載模板"] },
        { property: "Material", type: "string", labels: ["Material", "物料", "物料"] },
        { property: "MaterialType", type: "string", labels: ["Material Type", "物料类型", "物料類型"] },
        { property: "MaterialStatus", type: "string", labels: ["Material Status", "物料状态", "物料狀態"] },
        { property: "BomStatus", type: "string", labels: ["BOM Status", "BOM状态", "BOM狀態"] },
        { property: "MealType", type: "string", labels: ["Meal Type", "餐食类型", "餐食類型"] },
        { property: "Description", type: "string", labels: ["Description", "描述", "描述"] },
        { property: "CabinClass", type: "string", labels: ["Class", "舱位", "艙位"] },
        { property: "CostRunDate", type: "date", labels: ["Cost Run Date", "成本运行日期", "成本運行日期"] },
        { property: "QTStatus", type: "string", labels: ["Status", "状态", "狀態"], aliases: ["Quotation Status", "报价单状态", "報價單狀態"] },
        { property: "Sequence", type: "string", labels: ["Sequence", "序号", "序號"] },
        { property: "ItemRemark", type: "string", labels: ["Item Remark", "行项目备注", "行項目備註"] },
        { property: "Variant", type: "string", labels: ["Variant", "变式", "變式"] },
        { property: "YieldedFoodCost", type: "number", labels: ["Yielded Actual Cost", "产出实际成本", "產出實際成本"] },
        { property: "LabourMM", type: "number", labels: ["Labour MM", "人工工时", "人工工時"] },
        { property: "LabourRate", type: "number", labels: ["Labour Rate", "人工费率", "人工費率"] },
        { property: "LabourPrice", type: "number", labels: ["Labour costs", "人工成本", "人工成本"] },
        { property: "Overhead", type: "number", labels: ["Staff Overhead", "员工间接费用", "員工間接費用"] },
        { property: "Total", type: "number", labels: ["Total", "合计", "合計"] },
        { property: "STVariant", type: "string", labels: ["Variant", "变式", "變式"] },
        { property: "YieldedStandardFoodCost", type: "number", labels: ["Yielded Standard Cost", "产出标准成本", "產出標準成本"] },
        { property: "MarkUpPercent", type: "number", labels: ["Mark up %", "加成 %", "加成 %"] },
        { property: "STMarkUp", type: "number", labels: ["Yielded Standard Cost incl. Mark up", "含加成产出标准成本", "含加成產出標準成本"] },
        { property: "STLabourMM", type: "number", labels: ["Labour MM", "人工工时", "人工工時"] },
        { property: "LabourCostRate", type: "number", labels: ["Labour Cost Rate", "人工成本费率", "人工成本費率"] },
        { property: "LabourCost", type: "number", labels: ["Labour Cost", "人工成本", "人工成本"] },
        { property: "SMPLPercent", type: "number", labels: ["SMPL %", "SMPL %", "SMPL %"] },
        { property: "SMPLRatio", type: "number", labels: ["Normal Meal: SPML Ratio", "普通餐:SPML比率", "普通餐:SPML比率"] },
        { property: "LabourMMAdjustment", type: "number", labels: ["Labour MM Adjustment (%)", "人工工时调整 (%)", "人工工時調整 (%)"] },
        { property: "AdjustedLabourMM", type: "number", labels: ["Adjusted Labour MM", "调整后人工工时", "調整後人工工時"] },
        { property: "LabourMMAdjFix", type: "number", labels: ["Labour MM Adjustment (Fix Value)", "人工工时调整 (固定值)", "人工工時調整 (固定值)"] },
        { property: "LabourSellRate", type: "number", labels: ["Labour Sell Rate (Fix Value)", "人工销售费率 (固定值)", "人工銷售費率 (固定值)"] },
        { property: "STLabourPrice", type: "number", labels: ["Labour Price", "人工价格", "人工價格"] },
        { property: "STOverHead", type: "number", labels: ["Overhead", "间接费用", "間接費用"] },
        { property: "STOverHeadPercent", type: "number", labels: ["Overhead Adjustment (%)", "间接费用调整 (%)", "間接費用調整 (%)"] },
        { property: "AdjustedOverhead", type: "number", labels: ["Adjusted Overhead", "调整后间接费用", "調整後間接費用"] },
        { property: "OtherAdjustment", type: "number", labels: ["Other Adjustment", "其他调整", "其他調整"] },
        { property: "STTotal", type: "number", labels: ["Total", "合计", "合計"] },
        { property: "SalesPriceFood", type: "number", labels: ["Sales Price (Food)", "销售价格 (食品)", "銷售價格 (食品)"] },
        { property: "SalesPriceLabour", type: "number", labels: ["Sales Price (Labour)", "销售价格 (人工)", "銷售價格 (人工)"] },
        { property: "SalesPriceOverhead", type: "number", labels: ["Sales Price (Overhead)", "销售价格 (间接费用)", "銷售價格 (間接費用)"] },
        { property: "TotalSellingPrice", type: "number", labels: ["Total Selling Price", "总销售价格", "總銷售價格"] },
        { property: "FreeofCharge", type: "boolean", labels: ["Free of Charge", "免费", "免費"] },
        { property: "GrossProfit", type: "number", labels: ["Gross Profit", "毛利", "毛利"] },
        { property: "GrossProfitPercent", type: "number", labels: ["Gross Profit %", "毛利 %", "毛利 %"] },
        { property: "NetMargin", type: "number", labels: ["Net Margin", "净利润", "淨利潤"] },
        { property: "NetMarginPercent", type: "number", labels: ["Net Margin %", "净利润 %", "淨利潤 %"] },
        { property: "QuotedPrice", type: "number", labels: ["Quoted Price", "报价", "報價"] },
        { property: "IncrementPercent", type: "number", labels: ["Increment %", "增幅 %", "增幅 %"] },
        { property: "ProposedNewPrice", type: "number", labels: ["Proposed New Price", "建议新价格", "建議新價格"] },
        { property: "PrecedingQT", type: "boolean", labels: ["Preceding Quotation", "前置报价单", "前置報價單"] },
        { property: "ValidFrom", type: "date", labels: ["Valid From", "有效期起", "有效期起"] },
        { property: "ValidTo", type: "date", labels: ["Valid To", "有效期止", "有效期止"] },
        { property: "DiffPrevQTPrice", type: "number", labels: ["Diff. Prev. QT. Price", "与上次报价差异", "與上次報價差異"] },
        { property: "PrevQT", type: "string", labels: ["Prev. QT.", "上次报价单", "上次報價單"] },
        { property: "PrevQTItem", type: "string", labels: ["Prev. QT. Item", "上次报价行项目", "上次報價行項目"] },
        { property: "PreQTPrice", type: "number", labels: ["Prev. QT. Sales Price", "上次报价销售价格", "上次報價銷售價格"] },
        { property: "PrevQTCost", type: "number", labels: ["Prev. QT. Total Cost", "上次报价总成本", "上次報價總成本"] },
        { property: "Margin", type: "number", labels: ["Margin", "利润", "利潤"] },
        { property: "MarginPercnt", type: "number", labels: ["Margin %", "利润 %", "利潤 %"] },
        { property: "PrevValidFrom", type: "date", labels: ["Valid From", "有效期起", "有效期起"] },
        { property: "PrevValidTo", type: "date", labels: ["Valid To", "有效期止", "有效期止"] },
        { property: "Message", type: "string", labels: ["System Msg", "系统消息", "系統訊息"] }
    ];

    function languageIndex(sLanguage) {
        var sLang = String(sLanguage || "en").toLowerCase().replace("-", "_");
        if (sLang.indexOf("zh_tw") === 0 || sLang.indexOf("zh_hk") === 0 || sLang.indexOf("zf") === 0) {
            return 2;
        }
        if (sLang.indexOf("zh") === 0) {
            return 1;
        }
        return 0;
    }

    function headerLabels(sLanguage) {
        var iIndex = languageIndex(sLanguage);
        return aColumns.map(function (oColumn) {
            return oColumn.labels[iIndex];
        });
    }

    function normalizeHeader(vValue) {
        return String(vValue === undefined || vValue === null ? "" : vValue).trim().toLowerCase();
    }

    function pad(nValue) {
        return nValue < 10 ? "0" + nValue : String(nValue);
    }

    function formatDate(vValue, XLSX) {
        if (vValue === undefined || vValue === null || vValue === "") {
            return "";
        }
        if (vValue instanceof Date && !isNaN(vValue.getTime())) {
            return vValue.getFullYear() + "-" + pad(vValue.getMonth() + 1) + "-" + pad(vValue.getDate());
        }
        if (typeof vValue === "number" && XLSX && XLSX.SSF && XLSX.SSF.parse_date_code) {
            var oDate = XLSX.SSF.parse_date_code(vValue);
            if (oDate) {
                return oDate.y + "-" + pad(oDate.m) + "-" + pad(oDate.d);
            }
        }
        var sText = String(vValue).trim();
        var aMatch = sText.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
        if (aMatch) {
            return aMatch[1] + "-" + pad(parseInt(aMatch[2], 10)) + "-" + pad(parseInt(aMatch[3], 10));
        }
        return sText;
    }

    function parseBoolean(vValue) {
        if (typeof vValue === "boolean") {
            return vValue;
        }
        var sText = String(vValue === undefined || vValue === null ? "" : vValue).trim().toLowerCase();
        return sText === "true" || sText === "x" || sText === "1" || sText === "yes" || sText === "y";
    }

    function parseNumber(vValue) {
        if (typeof vValue === "number" && isFinite(vValue)) {
            return vValue;
        }
        if (vValue === undefined || vValue === null || String(vValue).trim() === "") {
            return "";
        }
        var nValue = parseFloat(String(vValue).replace(/,/g, ""));
        return isFinite(nValue) ? nValue : "";
    }

    function isEmptyRow(oItem) {
        return aColumns.every(function (oColumn) {
            var vValue = oItem[oColumn.property];
            return vValue === "" || vValue === null || vValue === undefined || vValue === false;
        });
    }

    function columnQueues() {
        var mQueues = {};
        aColumns.forEach(function (oColumn) {
            var aAliases = oColumn.labels.concat([oColumn.property]).concat(oColumn.aliases || []);
            aAliases.forEach(function (sAlias) {
                var sKey = normalizeHeader(sAlias);
                if (!sKey) {
                    return;
                }
                if (!mQueues[sKey]) {
                    mQueues[sKey] = [];
                }
                if (mQueues[sKey].indexOf(oColumn.property) < 0) {
                    mQueues[sKey].push(oColumn.property);
                }
            });
        });
        return mQueues;
    }

    function parseSheet(XLSX, oSheet) {
        var aRows = XLSX.utils.sheet_to_json(oSheet, { header: 1, defval: "", raw: true });
        if (!aRows.length) {
            return [];
        }
        var aHeader = aRows[0];
        var mQueues = columnQueues();
        var mUsed = {};
        var aMap = aHeader.map(function (vHeader) {
            var aQueue = mQueues[normalizeHeader(vHeader)] || [];
            var sProperty = "";
            aQueue.some(function (sCandidate) {
                if (!mUsed[sCandidate]) {
                    sProperty = sCandidate;
                    mUsed[sCandidate] = true;
                    return true;
                }
                return false;
            });
            return sProperty;
        });
        if (!aMap.filter(Boolean).length) {
            throw new Error("Unrecognized quotation columns");
        }
        var mType = {};
        aColumns.forEach(function (oColumn) {
            mType[oColumn.property] = oColumn.type;
        });
        return aRows.slice(1).map(function (aRow) {
            var oItem = {};
            aMap.forEach(function (sProperty, iIndex) {
                if (!sProperty) {
                    return;
                }
                var vValue = aRow[iIndex];
                if (mType[sProperty] === "boolean") {
                    oItem[sProperty] = parseBoolean(vValue);
                } else if (mType[sProperty] === "number") {
                    oItem[sProperty] = parseNumber(vValue);
                } else if (mType[sProperty] === "date") {
                    oItem[sProperty] = formatDate(vValue, XLSX);
                } else {
                    oItem[sProperty] = vValue === undefined || vValue === null ? "" : vValue;
                }
            });
            return oItem;
        }).filter(function (oItem) {
            return !isEmptyRow(oItem);
        });
    }

    function toNumber(vValue) {
        var nValue = parseFloat(vValue);
        return isFinite(nValue) ? nValue : 0;
    }

    function formulaDefs(mCol, bGrossProfitMode) {
        function ref(sProperty, iRow) {
            return mCol[sProperty] + iRow;
        }
        return {
            LabourPrice: function (r) {
                return ref("LabourMM", r) + "*" + ref("LabourRate", r);
            },
            Total: function (r) {
                return ["YieldedFoodCost", "LabourMM", "LabourRate", "LabourPrice"]
                    .map(function (p) { return ref(p, r); }).join("+");
            },
            LabourMMAdjustment: function (r) {
                return "IF(OR(" + ref("SMPLPercent", r) + "=0," + ref("SMPLRatio", r) + "=0)," + ref("LabourMMAdjustment", r) + ",((1*(1-" + ref("SMPLPercent", r) + "/100)+" + ref("SMPLPercent", r) + "/100*" + ref("SMPLRatio", r) + ")-1)*100)";
            },
            STMarkUp: function (r) {
                return ref("YieldedStandardFoodCost", r) + "*(1+" + ref("MarkUpPercent", r) + "/100)";
            },
            LabourCost: function (r) {
                return ref("STLabourMM", r) + "*" + ref("LabourCostRate", r);
            },
            AdjustedLabourMM: function (r) {
                return ref("STLabourMM", r) + "*(1+" + ref("LabourMMAdjustment", r) + "/100)";
            },
            STLabourPrice: function (r) {
                return "IF(AND(" + ref("LabourMMAdjFix", r) + "=0," + ref("LabourSellRate", r) + "=0)," +
                    ref("AdjustedLabourMM", r) + "*" + ref("LabourCostRate", r) + "," +
                    "IF(AND(" + ref("LabourMMAdjFix", r) + "=0," + ref("LabourSellRate", r) + ">0)," +
                    ref("AdjustedLabourMM", r) + "*" + ref("LabourSellRate", r) + "," +
                    "IF(AND(" + ref("LabourMMAdjFix", r) + ">0," + ref("LabourSellRate", r) + "=0)," +
                    ref("LabourMMAdjFix", r) + "*" + ref("LabourCostRate", r) + "," +
                    ref("LabourMMAdjFix", r) + "*" + ref("LabourSellRate", r) + ")))";
            },
            AdjustedOverhead: function (r) {
                return ref("STOverHead", r) + "*(1+" + ref("STOverHeadPercent", r) + "/100)";
            },
            STTotal: bGrossProfitMode
                ? function (r) {
                    return ref("YieldedStandardFoodCost", r) + "+" + ref("OtherAdjustment", r);
                }
                : function (r) {
                    return ["STMarkUp", "STLabourPrice", "AdjustedOverhead", "OtherAdjustment"]
                        .map(function (p) { return ref(p, r); }).join("+");
                },
            SalesPriceFood: bGrossProfitMode
                ? function (r) {
                    return ref("YieldedStandardFoodCost", r) + "+" + ref("OtherAdjustment", r);
                }
                : function (r) {
                    return ref("STMarkUp", r) + "+" + ref("OtherAdjustment", r);
                },
            SalesPriceLabour: function (r) {
                return ref("STLabourPrice", r);
            },
            SalesPriceOverhead: function (r) {
                return ref("AdjustedOverhead", r);
            },
            TotalSellingPrice: bGrossProfitMode
                ? function (r) {
                    return ref("SalesPriceFood", r);
                }
                : function (r) {
                    return ["SalesPriceFood", "SalesPriceLabour", "SalesPriceOverhead"]
                        .map(function (p) { return ref(p, r); }).join("+");
                },
            GrossProfit: function (r) {
                return ref("QuotedPrice", r) + "-" + ref("YieldedStandardFoodCost", r);
            },
            GrossProfitPercent: function (r) {
                return "IF(" + ref("TotalSellingPrice", r) + "=0,0," + ref("GrossProfit", r) + "/" + ref("TotalSellingPrice", r) + "*100)";
            },
            NetMargin: function (r) {
                return ref("QuotedPrice", r) + "-" + ref("YieldedStandardFoodCost", r) + "-" + ref("LabourCost", r) + "-" + ref("STOverHead", r);
            },
            NetMarginPercent: function (r) {
                return "IF(" + ref("TotalSellingPrice", r) + "=0,0," + ref("NetMargin", r) + "/" + ref("TotalSellingPrice", r) + "*100)";
            },
            QuotedPrice: function (r) {
                return "IF(" + ref("FreeofCharge", r) + "=TRUE,0," + ref("TotalSellingPrice", r) + ")";
            },
            ProposedNewPrice: function (r) {
                return ref("QuotedPrice", r) + "*(1+" + ref("IncrementPercent", r) + "/100)";
            }
        };
    }

    function cellValue(oItem, oColumn) {
        var vValue = oItem[oColumn.property];
        if (oColumn.type === "boolean") {
            return !!vValue;
        }
        if (oColumn.type === "date") {
            return formatDate(vValue);
        }
        if (vValue === undefined || vValue === null) {
            return "";
        }
        return vValue;
    }

    function buildSheet(XLSX, aItems, sLanguage, bGrossProfitMode) {
        var aLabels = headerLabels(sLanguage);
        var aoa = [aLabels];
        aItems.forEach(function (oItem) {
            aoa.push(aColumns.map(function (oColumn) {
                return cellValue(oItem, oColumn);
            }));
        });
        var oSheet = XLSX.utils.aoa_to_sheet(aoa);
        var mCol = {};
        aColumns.forEach(function (oColumn, iIndex) {
            mCol[oColumn.property] = XLSX.utils.encode_col(iIndex);
        });
        var mFormulas = formulaDefs(mCol, !!bGrossProfitMode);
        aItems.forEach(function (oItem, iIndex) {
            var iExcelRow = iIndex + 2;
            Object.keys(mFormulas).forEach(function (sProperty) {
                if (!mCol[sProperty]) {
                    return;
                }
                oSheet[mCol[sProperty] + iExcelRow] = {
                    t: "n",
                    f: mFormulas[sProperty](iExcelRow),
                    v: toNumber(oItem[sProperty])
                };
            });
        });
        return oSheet;
    }

    function writeWorkbook(XLSX, oSheet, sFileName) {
        var oWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(oWorkbook, oSheet, "Quotation");
        XLSX.writeFile(oWorkbook, sFileName);
    }

    return {
        getColumns: function () {
            return aColumns;
        },
        headerLabels: headerLabels,
        parseSheet: parseSheet,
        buildSheet: buildSheet,
        writeWorkbook: writeWorkbook
    };
});
