sap.ui.define(
    [
        "sap/fe/core/AppComponent",
        "com/cathaydining/zppe021/ext/formatter",
        "sap/base/util/ObjectPath"
    ],
    function (Component, formatter, ObjectPath) {
        "use strict";

        // Manifest bindings resolve formatters via ObjectPath (global name).
        // bExport is unreliable under FE/FLP, so register explicitly.
        ObjectPath.set("com.cathaydining.zppe021.ext.formatter", formatter);

        return Component.extend("com.cathaydining.zppe021.Component", {
            metadata: {
                manifest: "json"
            }
        });
    }
);