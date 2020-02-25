"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "Datasource", {
  enumerable: true,
  get: function get() {
    return _datasource.MachbaseDatasource;
  }
});
Object.defineProperty(exports, "QueryCtrl", {
  enumerable: true,
  get: function get() {
    return _query_ctrl.MachbaseDatasourceQueryCtrl;
  }
});
exports.QueryOptionsCtrl = exports.ConfigCtrl = void 0;

var _datasource = require("./datasource");

var _query_ctrl = require("./query_ctrl");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MachbaseConfigCtrl = function MachbaseConfigCtrl() {
  _classCallCheck(this, MachbaseConfigCtrl);
};

exports.ConfigCtrl = MachbaseConfigCtrl;
MachbaseConfigCtrl.templateUrl = 'partials/config.html';

var MachbaseQueryOptionsCtrl = function MachbaseQueryOptionsCtrl() {
  _classCallCheck(this, MachbaseQueryOptionsCtrl);
};

exports.QueryOptionsCtrl = MachbaseQueryOptionsCtrl;
MachbaseQueryOptionsCtrl.templateUrl = 'partials/query.options.html';