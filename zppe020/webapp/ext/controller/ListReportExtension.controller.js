sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension'
], function (ControllerExtension) {
	'use strict';

	return ControllerExtension.extend('com.cathaydining.zppe020.ext.controller.ListReportExtension', {
		_iRefreshInterval: null,
		_bSearchAttached: false,
		_oAudioContext: null,

		override: {
			onInit: function () {

			},

			onAfterRendering: function () {
				if (!this._bSearchAttached) {
					var oFilterBar = this._findFilterBar();
					if (oFilterBar) {
						oFilterBar.attachSearch(this._onSearch, this);
						this._bSearchAttached = true;
					}
				}
			},

			onExit: function () {
				if (this._iRefreshInterval) {
					clearInterval(this._iRefreshInterval);
					this._iRefreshInterval = null;
				}
				this._bSearchAttached = false;
			}
		},

		_findFilterBar: function () {
			var oView = this.base.getView();
			if (!oView) {
				return null;
			}
			var aFilterBars = oView.findAggregatedObjects(true, function (oControl) {
				return oControl.isA && (oControl.isA('sap.fe.core.controls.FilterBar') || oControl.isA('sap.ui.mdc.FilterBar'));
			});
			return aFilterBars.length ? aFilterBars[0] : null;
		},

		_onSearch: function () {
			this._ensureAudioContext();
			if (!this._iRefreshInterval) {
				this._iRefreshInterval = setInterval(function () {
					this._refreshAndCheck();
				}.bind(this), 60000);
			}
		},

		_ensureAudioContext: function () {
			if (this._oAudioContext) {
				return;
			}
			try {
				var AudioContext = window.AudioContext || window.webkitAudioContext;
				if (AudioContext) {
					this._oAudioContext = new AudioContext();
				}
			} catch (e) {
				// ignore
			}
		},

		_refreshAndCheck: function () {
			var oPromise = this.base.getExtensionAPI().refresh();
			if (oPromise && typeof oPromise.then === 'function') {
				oPromise.then(function () {
					this._checkRecentChanges();
				}.bind(this)).catch(function () {
					// ignore refresh errors
				});
			} else {
				this._checkRecentChanges();
			}
		},

		_checkRecentChanges: function () {
			var oListBinding = this._findListBinding();
			if (!oListBinding) {
				return;
			}
			oListBinding.requestContexts(0, 1000000).then(function (aContexts) {
				var iNow = Date.now();
				var bRecent = aContexts.some(function (oContext) {
					var vChangedAt = oContext.getProperty('ZchangedAt');
					if (!vChangedAt) {
						return false;
					}
					var iChanged = (vChangedAt instanceof Date) ? vChangedAt.getTime() : new Date(vChangedAt).getTime();
					return !isNaN(iChanged) && (iNow - iChanged) <= 60000;
				});
				if (bRecent) {
					this._playNotificationSound();
				}
			}.bind(this)).catch(function () {
				// ignore read errors
			});
		},

		_findListBinding: function () {
			var oView = this.base.getView();
			if (!oView) {
				return null;
			}
			var aBindings = [];
			oView.findAggregatedObjects(true, function (oControl) {
				if (aBindings.length) {
					return false;
				}
				var oBinding = oControl.getBinding && (oControl.getBinding('rows') || oControl.getBinding('items'));
				if (oBinding && oBinding.isA && oBinding.isA('sap.ui.model.odata.v4.ODataListBinding')) {
					aBindings.push(oBinding);
					return true;
				}
				return false;
			});
			return aBindings.length ? aBindings[0] : null;
		},

		_playNotificationSound: function () {
			try {
				if (!this._oAudioContext) {
					return;
				}
				if (this._oAudioContext.state === 'suspended') {
					this._oAudioContext.resume();
				}
				var oOsc = this._oAudioContext.createOscillator();
				var oGain = this._oAudioContext.createGain();
				oOsc.connect(oGain);
				oGain.connect(this._oAudioContext.destination);
				oOsc.type = 'sine';
				oOsc.frequency.value = 880;
				oGain.gain.setValueAtTime(0.1, this._oAudioContext.currentTime);
				oGain.gain.exponentialRampToValueAtTime(0.00001, this._oAudioContext.currentTime + 0.3);
				oOsc.start();
				oOsc.stop(this._oAudioContext.currentTime + 0.3);
			} catch (e) {
				// ignore audio errors
			}
		}
	});
});
