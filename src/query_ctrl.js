import { QueryCtrl } from 'app/plugins/sdk';
import './css/query-editor.css!'

export class MachbaseDatasourceQueryCtrl extends QueryCtrl {
  constructor($scope, $injector, uiSegmentSrv) {
    super($scope, $injector);

    this.scope = $scope;
    this.uiSegmentSrv = uiSegmentSrv;

    if (!this.target.target) {
      this.target.target = {};
    }
    if (!this.target.tables) {
        this.target.tables = [];
    }
    if (!this.target.tables_type) {
        this.target.tables_type = [];
    }
    if (!this.target.tag_list) {
        this.target.tag_list = [];
    }

    this.panel.stack = false;

    if (!this.target.target.downsampling) {
      this.target.target.downsampling = 'AVG';
    }
    if (!this.target.target.sampling) {
      this.target.target.sampling = this.datasource.sampling;
    }
    if (!this.target.target.filters) {
      this.target.target.filters = [{ 'key': '--select column--', 'value': '', 'op': '=', 'numeric': false, 'input': 'select', 'list': [] }]; // input : text | select
    }
    if (!this.target.target.query) {
      this.target.target.query = '';
    }
    if (!this.target.target.rawQuery) {
      this.target.target.rawQuery = false;
    }
    if (!this.target.target.columns) {
      this.target.target.columns = [];
    }
    if (!this.target.target.ncolumns) {
      this.target.target.ncolumns = [];
    }
    if (!this.target.target.dcolumns || this.target.target.dcolumns.length == 0) {
      this.target.target.dcolumns = ['_arrival_time'];
    }
    if (!this.target.target.gcolumns) {
      this.target.target.gcolumns = ['(NONE)'];
    }
    if (!this.target.target.column) {
      this.target.target.column = '';
    }
    if (!this.target.target.metric) {
      this.target.target.metric = '';
    }
    if (!this.target.target.colinput) {
      this.target.target.colinput = 'select'; // colinput : text | select
    }
    if (!this.target.target.targetname) {
      this.target.target.targetname = '';
    }
    if (!this.target.target.timefield) {
      this.target.target.timefield = '_arrival_time';
    }
    if (!this.target.target.limit) {
      this.target.target.limit = '';
    }
    if (!this.target.target.groupfield) {
      this.target.target.groupfield = '';
    }

    if (!this.target.target.orderby) {
      if (typeof this.target.target.orderby === 'undefined') {
        if (this.target.target.colinput === 'select' && this.target.target.groupfield === '(NONE)') {
          this.target.target.orderby = '';
        } else {
          this.target.target.orderby = '1 ASC';
        }
      } else {
        this.target.target.orderby = '';
      }
    }

    if (!this.target.target.useduration) {
        this.target.target.useduration = 'Y';
    }
    if (!this.target.target.duration) {
        this.target.target.duration = '';
    }

    this.target.target.pluginId = this.panel.type;

    if (!this.target.target.xinput) {
      if (this.target.target.pluginId === 'table') {
        this.target.target.xinput = 'group';
      } else {
        this.target.target.xinput = 'time';
      }
    }

    this.scope.metric = {
      list: this.target.tables,
      value: this.target.target.metric
    };

    this.scope.column = {
      list : this.target.target.columns,
      value : this.target.target.column
    };

    if (!this.target.target.datasource_name) {
        this.target.target.datasource_name = '';
    }

    if (this.target.tables.length === 0 || this.datasource.name !== this.target.target.datasource_name) {
      this.updateTableList();
    } else {
      this.scope.metric.list = this.target.tables;

      if (this.target.target.metric === '' && this.scope.metric.list.length > 0) {
          this.target.target.metric = this.scope.metric.list[0];
      }

      this.scope.metric.value = this.target.target.metric;

      if (this.target.target.columns.length === 0) {
        this.updateColumnList();
      } else if (this.target.target.column !== '') {
        this.scope.column.value = this.target.target.column;
      }

      this.validateTarget(this.target.target);
    }

    if (!this.target.target.useAlert) {
      this.target.target.useAlert = 'N';
    }
    if (!this.target.target.alerts) {
      this.target.target.alerts = [{ 'type': 'each', 'operator': 'and', 'reducer': 'avg', 'range': 'all', 'evaluator': { 'type': 'gt', 'value1': 0, 'value2': 0 }}];
    }
    if (!this.target.target.sameAs) {
      this.target.target.sameAs = '';
    }
    if (!this.target.target.metric_type) {
      this.target.target.metric_type = '';
    }
    if (!this.target.target.tag_mode) {
      this.target.target.tag_mode = '';
    }
    if (!this.target.target.errors) {
      this.target.target.errors = {};
    }

    this.target.hide = false;
  }

  updateTableList() {
    if (this.target.target.metric === '') {
      this.scope.metric = {
        list: ['Loading...'],
        value: 'Loading...'
      };
    }

    var ctrl = this;

    this.datasource._get('tables_type').then(response => {
      var sTables = response.data.map(tbl => tbl.name);
      var sTypes = response.data.map(tbl => tbl.type); // '0':Log, '1':Meta/Virtual, '2':Lookup, '3':Volatile, '4':Lookup, '5':KV, '6':Tag
      
      ctrl.target.tables = sTables;
      ctrl.target.tables_type = sTypes;
      ctrl.scope.metric.list = ctrl.target.tables;
      ctrl.target.target.datasource_name = ctrl.datasource.name;

      if (ctrl.target.target.metric === '' || ctrl.target.tables.indexOf(ctrl.target.target.metric) < 0) {
        if (ctrl.target.tables.length > 0) {
          ctrl.target.target.metric = ctrl.target.tables[0];
          ctrl.target.target.metric_type = ctrl.target.tables_type[0];
        } else {
          ctrl.target.target.metric = '';
          ctrl.target.target.metric_type = '';
        }

        ctrl.setDefaultTagMode(ctrl.target.target, ctrl.target.target.metric_type);
        ctrl.scope.metric.value = ctrl.target.target.metric;
        ctrl.updateColumnList();
        ctrl.validateTarget(ctrl.target.target);
      } else {
        ctrl.scope.metric.value = ctrl.target.target.metric;
      }
    });
  }

  updateColumnList() {
    if (this.target.target.metric === 'Loading...' || this.target.target.metric === '') return;

    var sIdx = this.target.tables.indexOf(this.target.target.metric);

    if (sIdx >= 0) {
      this.target.target.metric_type = this.target.tables_type[sIdx];
    } else return; // impossible case

    this.setDefaultTagMode(this.target.target, this.target.target.metric_type);
    this.scope.metric.value = this.target.target.metric;

    var sSc = this.scope;
    var sTa = this.target.target;

    if (sTa.colinput === 'select') {
      this.scope.column.list = ['Loading...'];
      this.scope.column.value = 'Loading...';
    }

    var ctrl = this;

    this.datasource._get(`columns/${this.target.target.metric}?dic=1`).then(response => {
      if (response.$$status !== 200) {
        sTa.columns = [];
        sTa.gcolumns = ['(NONE)'];
        sTa.ncolumns = [];

        if (sTa.metric_type === '0') { // Log table
          sTa.dcolumns = ['_arrival_time'];
        } else {
          sTa.dcolumns = [];
          sTa.useduration = 'N';
        }
      } else {
        var sNumericType = ['4', '8', '12', '16', '20', '104', '108', '112'];

        sTa.columns = response.data.map(col => col.name);
        sTa.ncolumns = response.data.filter(col => sNumericType.indexOf(col.type) > -1).map(col => col.name);
        sTa.dcolumns = response.data.filter(col => col.type === '6').map(col => col.name); // datetime
        sTa.gcolumns = response.data.filter(col => col.type !== '6').map(col => col.name); // no datetime
        sTa.gcolumns.unshift('(NONE)');

        if (sTa.metric_type === '0') { // Log Table
          sTa.dcolumns.unshift('_arrival_time');
        }
      }

      if (sTa.gcolumns.length === 0) {
          sTa.groupfield = '';
          sTa.orderby = '';
      } else if (!(sTa.groupfield in sTa.gcolumns) || sTa.groupfield === '') {
          sTa.groupfield = sTa.gcolumns[0];
          sTa.orderby = '';
      }

      if (!(sTa.timefield in sTa.dcolumns)) {
          if (sTa.dcolumns.length > 0) {
            sTa.timefield = sTa.dcolumns[0];
          } else {
            sTa.timefield = '';
          }
      }

      sSc.column.list = sTa.columns;

      if (sTa.metric_type === '6') {
        sTa.colinput = 'text';

        if (ctrl.target.tag_list.length > 0) {
          sTa.column = ctrl.target.tag_list[0];
        } else {
          sTa.column = '';
        }
      } else if (sTa.colinput === 'select' || sTa.column === '') {
        if (sTa.colinput === 'text') {
          sTa.column = 'count(*)';
        } else if (sTa.columns.length > 0) {
          sTa.column = sTa.columns[0];
        } else {
          sTa.column = '';
        }

        sSc.column.value = sTa.column;
      }

      ctrl.validateTarget(sTa);

      for (var i = 0; i < ctrl.panel.targets.length; i++) {
        if (ctrl.panel.targets[i].target.sameAs === ctrl.target.refId) {
          ctrl.panel.targets[i].target.columns = ctrl.target.target.columns;
          ctrl.panel.targets[i].target.dcolumns = ctrl.target.target.dcolumns;
          ctrl.panel.targets[i].target.gcolumns = ctrl.target.target.gcolumns;
          ctrl.panel.targets[i].target.ncolumns = ctrl.target.target.ncolumns;
          ctrl.panel.targets[i].target.metric = ctrl.target.target.metric;
          ctrl.panel.targets[i].target.metric_type = ctrl.target.target.metric_type;
          ctrl.setDefaultTagMode(ctrl.panel.targets[i].target, ctrl.target.target.metric_type);
          ctrl.panel.targets[i].tables = ctrl.target.tables;

          if (ctrl.panel.targets[i].target.colinput === 'text') {
            ctrl.panel.targets[i].target.column = 'count(*)';
          } else if (ctrl.panel.targets[i].target.columns.length > 0) {
            ctrl.panel.targets[i].target.column = ctrl.panel.targets[i].target.columns[0];
          } else {
            ctrl.panel.targets[i].target.column = '';
          }

          ctrl.panel.targets[i].tables = ctrl.target.tables;
          ctrl.panel.targets[i].tables_type = ctrl.target.tables_type;
        }
      }
    });
  }

  targetBlur() {
    if (this.target.target.tag_mode !== 'Y') {
      if (this.target.target.ncolumns.indexOf(this.target.target.column) < 0 && this.target.target.downsampling.substr(0, 5) !== 'COUNT' && this.target.target.downsampling !== '(NONE)') {
        this.target.target.downsampling = 'COUNT';
      }

      if (this.target.target.downsampling === 'COUNT(*)') {
        this.target.target.column = 'COUNT(*)';
      } else if (this.target.target.downsampling == '(NONE)' && this.target.target.column == 'COUNT(*)') {
        this.target.target.column = '';
      }
    }

    this.scope.metric.value = this.target.target.metric;
    this.scope.column.value = this.target.target.column;
    this.datasource.sampling = this.target.target.sampling;
    this.validateTarget(this.target.target);
  }

  groupChange() {
      if (this.target.target.groupfield === '(NONE)') {
          this.target.target.orderby = '';
      } else if (this.target.target.orderby === '') {
          this.target.target.orderby = '1 ASC';
      }
  }

  validateTarget(target) {
    var errs = {};
    var sValues = [];
    var sVariables = this.datasource.templateSrv.variables.filter(v => v.type !== 'datasource');

    if (target.metric === '') {
      errs.metric = "Metric name is required";
      errs.last_error = errs.metric;
    } else {
      sValues.push(target.metric);
    }

    if (target.tag_mode === 'Y') {
      if (target.column === '' && target.downsampling !== 'COUNT(*)') {
        errs.column = "Tag is required";
        errs.last_error = errs.column;
      } else {
        sValues.push(target.column);
      }
    } else {
      if (target.column === '' && target.downsampling !== 'COUNT(*)') {
        errs.column = "Column name is required";
        errs.last_error = errs.column;
      } else {
        sValues.push(target.column);
      }
      if (target.xinput === 'time' && target.timefield === '') {
        errs.timefield = "Time column name is required";
        errs.last_error = errs.timefield;
      } else if (target.timefield !== '') {
        sValues.push(target.timefield);
      }
      if (target.xinput !== 'time' && target.groupfield === '') {
        errs.groupfield = "Group column name is required";
        errs.last_error = errs.groupfield;
      } else if (target.groupfield !== '') {
        sValues.push(target.groupfield);
      }
    }

    if (target.downsampling === '') {
      errs.downsampling = "Aggregator is required";
      errs.last_error = errs.downsampling;
    } else {
      sValues.push(target.downsampling);
    }

    if (target.sampling)
    {
      sValues.push(target.sampling);
    }
    if (target.limit)
    {
      sValues.push(target.limit);
    }
    if (target.orderby)
    {
      sValues.push(target.orderby);
    }
    if (target.targetname)
    {
      sValues.push(target.targetname);
    }

    var sErr = this.checkVaribles(sVariables, sValues);

    if (sErr !== '')
    {
      errs.variables = sErr;
      errs.last_error = errs.variables;
    }

    if (target.sampling && target.sampling.indexOf('$') < 0 && target.sampling.indexOf('[[') < 0) {
      try {
        var sSampling = this.datasource.convertToMachbaseInterval(target.sampling);

        this.target.target.sampling = sSampling.input;
      } catch (err) {
        errs.sampling = err.message;
        errs.last_error = errs.metric;
      }
    }

    this.target.target.errors = errs;
  }

  checkVaribles(aVariables, aValues) {
    var sRet = '';
    // remove datasource variable and make regex
    var sRegs = [];
    var sVals = [];

    this.datasource.MakeReplaceVariables(aVariables, {}, sRegs, sVals);

    for (var j = 0; j < aValues.length; j++) {
      var sValue = aValues[j];

      for (var i = 0; i < sRegs.length; i++) {
        sValue = sValue.replace(sRegs[i], '');
      }

      if (sValue !== '') {
        var sIdx = sValue.indexOf('$');

        if (sIdx > -1) {
          var sSplit = sValue.substring(sIdx).split(' ');

          sRet = `${sSplit[0]} variable is not defined`;

          break;
        }

        sIdx = sValue.indexOf('[[');

        if (sIdx > -1) {
          sValue = sValue.substring(sIdx);
          sIdx = sValue.indexOf(']]');

          if (sIdx > -1) {
            sRet = `${sValue.substring(0, sIdx)}]] variable is not defined`;

            break;
          }
        }
      }
    }

    return sRet;
  }

  toggleEditorMode() {
    this.target.target.rawQuery = !this.target.target.rawQuery;
    this.target.target.errors = {};
    this.target.target.query = '';

    if (this.target.target.rawQuery) {
      this.target.target.useduration = 'N';
      this.target.target.duration = '';
      this.target.target.useAlert = 'N';
      this.target.target.alerts.length = 0;
      this.setDefaultTagMode(this.target.target, '0'); // set this.target.target.tag_mode to 'N' ('0': Log table)
    } else {
      this.setDefaultTagMode(this.target.target, this.target.target.metric_type);
      this.validateTarget(this.target.target);
    }
  }

  onChangeInternal() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data
  }

  getKeyValues(key, idx) {
    this.target.target.filters[idx].numeric = this.target.target.ncolumns.indexOf(key) > -1;

    if (key === '' || key === null || key === '--select column--') {
      this.target.target.filters[idx].list = [];
      this.target.target.filters[idx].value = '';

      return this.datasource.q.when([]);
    }

    var data = {
      'table': this.target.target.metric,
      'column': key,
      'start_absolute': this.panelCtrl.range.from._d.getTime(),
      'end_absolute': this.panelCtrl.range.to._d.getTime()
    };

    this.target.target.filters[idx].list = ['Loading...'];
    this.target.target.filters[idx].value = 'Loading...';

    var ctrl = this;

    return this.datasource._post('uniques', data).then(response => {
      var sValue = [];

      if (response.$$status === 200) {
        sValue = response;
      }

      if (sValue.length > 0) {
        ctrl.target.target.filters[idx].value = sValue[0];
      } else {
        ctrl.target.target.filters[idx].value = '';
      }

      ctrl.target.target.filters[idx].list = sValue;

      return sValue;
    });
  }

  addFilter() {
    var sValue = { 'key': '--select column--', 'value': '', 'op': '=', 'numeric': false ,'input': 'select', 'list': [] };

    this.target.target.filters.push(sValue);

    return sValue;
  }

  removefilter(idx) {
    var sValue = this.target.target.filters[idx];

    this.target.target.filters.splice(idx, 1);

    if (this.target.target.filters.length === 0) {
      this.target.target.filters.push({ 'key': '--select column--', 'value': '', 'op': '=', 'numeric': false, 'input': 'select', 'list': [] });
    }

    return sValue;
  }

  toggleInputMode(idx) {
    if (this.target.target.filters[idx].input === 'select') {
      this.target.target.filters[idx].input = 'text';
    } else {
      this.target.target.filters[idx].input = 'select';
    }
  }

  toggleColumnInputMode() {
    if (this.target.target.colinput === 'select') {
      this.target.target.colinput = 'text';
    } else {
      this.target.target.colinput = 'select';
    }

    if (this.target.target.metric_type === '6' && this.target.target.colinput === 'select' && this.target.tag_list.length === 0) {
      var ctrl = this;

      this.datasource._get('tag_list').then(response => {
        ctrl.target.tag_list = response.data.map(tbl => tbl.name);

        if (ctrl.target.tag_list.length > 0 && (ctrl.target.target.column === '' || ctrl.target.tag_list.indexOf(ctrl.target.target.column) < 0)) {
          ctrl.target.target.column = ctrl.target.tag_list[0];
          ctrl.validateTarget(ctrl.target.target);
        }
      });
    } else if (this.target.target.metric_type !== '6' && this.target.target.colinput === 'select') {
      if (this.target.target.column.toLowerCase() === 'count(*)') {
        this.target.target.downsampling = 'COUNT(*)';
      }
    }
  }

  toggleXAxisInputMode() {
    if (this.target.target.xinput === 'time') {
      this.target.target.xinput = 'group';
    } else {
      this.target.target.xinput = 'time';
    }

    if (this.target.target.dcolumns.length < 0) {
      this.target.target.xinput = 'group';
    }

    if (this.target.target.xinput === 'group') {
      this.target.target.timefield = '';
    } else {
      this.target.target.groupfield = '';
      this.target.target.orderby = '';
    }
  }

  toggleUseDuration() {
    if (this.target.target.useduration === 'Y') {
      this.target.target.useduration = 'N';
      this.target.target.duration = '';
    } else {
      this.target.target.useduration = 'Y';
    }
  }

  toggleUseAlert() {
    if (this.target.target.useAlert === 'Y') {
      this.target.target.useAlert = 'N';
      this.target.target.alerts.length = 0;
    } else {
      this.target.target.useAlert = 'Y';
    }

    var sValue = { 'type': 'each', 'operator': 'and', 'reducer': 'avg', 'range': 'all', 'evaluator': { 'type': 'gt', 'value1': 0, 'value2': 0 }};

    if (this.target.target.alerts.length === 0) {
        this.target.target.alerts.push(sValue);
    }
  }

  addAlert() {
    var sValue = { 'type': 'each', 'operator': 'and', 'reducer': 'avg', 'range': 'all', 'evaluator': { 'type': 'gt', 'value1': 0, 'value2': 0 }};

    this.target.target.alerts.push(sValue);

    return sValue;
  }

  toggleOperator(idx) {
    var sValue = this.target.target.alerts[idx];

    if (sValue.operator === 'and') {
      this.target.target.alerts[idx].operator = 'or';
    } else {
      this.target.target.alerts[idx].operator = 'and';
    }
  }

  toggleType(idx) {
    var sValue = this.target.target.alerts[idx];

    if (sValue.type === 'each') {
      this.target.target.alerts[idx].type = 'all';
    } else {
      this.target.target.alerts[idx].type = 'each';
    }
  }

  toggleEffectivRange(idx) {
    var sValue = this.target.target.alerts[idx];

    if (sValue.range === 'all') {
      this.target.target.alerts[idx].range = '5m';
    } else {
      this.target.target.alerts[idx].range = 'all';
    }
  }

  checkAlertRange(idx) {
    var errs = {};
    var sValue = this.target.target.alerts[idx];

    if (sValue.range === 'all') {
      return true;
    } else {
      var range_regex = /(\d+)([hms])/;
      var matches = sValue.range.toLowerCase().match(range_regex);

      if (!matches) {
        errs.alert_range = 'Invalid time range string, expecting a number followed by one of "h m s" (e.g. 10m)';
        errs.last_error = errs.alert_range;

        this.target.target.errors = errs;

        return false;
      } else {
        this.target.target.alerts[idx].range = matches[1] + matches[2];

        return true;
      }
    }
  }

  removeAlert(idx) {
    var sValue = { 'type': 'each', 'operator': 'and', 'reducer': 'avg', 'range': 'all', 'evaluator': { 'type': 'gt', 'value1': 0, 'value2': 0 }};

    this.target.target.alerts.splice(idx, 1);

    if (this.target.target.alerts.length === 0) {
      this.target.target.alerts.push(sValue);
      this.target.target.useAlert = 'N';
    }
    return sValue;
  }

  changeSameAs() {
    if (this.target.target.sameAs === '') {
      this.target.target.sameAs = this.panel.targets[0].refId;
      this.updateSameColumns();
    } else {
      this.target.target.sameAs = '';
      this.target.target.useAlert = 'N';
      this.target.target.alerts.length = 0;

      if (this.target.tables.length > 0) {
        this.target.target.metric = this.target.tables[0];
        this.target.target.metric_type = this.target.tables_type[0];
      } else {
        this.target.target.metric = '';
        this.target.target.metric_type = '';
      }
      this.setDefaultTagMode(this.target.target, this.target.target.metric_type);
      this.scope.metric.value = this.target.target.metric;
      this.updateColumnList();
      this.validateTarget(this.target.target);
    }
  }

  getRefIds() {
    var sRet = [];

    for (var i = 0; i < this.panel.targets.length; i++) {
      if (this.panel.targets[i].hasOwnProperty('target') && this.panel.targets[i].target.sameAs === '' && this.panel.targets[i].target.metric_type !== '6') {
        sRet.push(this.panel.targets[i].refId);
      }
    }

    return sRet;
  }

  updateSameColumns() {
    for (var i = 0; i < this.panel.targets.length; i++) {
      if (this.panel.targets[i].refId === this.target.target.sameAs) {
        this.target.target.columns = this.panel.targets[i].target.columns;
        this.target.target.dcolumns = this.panel.targets[i].target.dcolumns;
        this.target.target.gcolumns = this.panel.targets[i].target.gcolumns;
        this.target.target.ncolumns = this.panel.targets[i].target.ncolumns;
        this.target.target.metric = this.panel.targets[i].target.metric;
        this.target.target.metric_type = this.panel.targets[i].target.metric_type;
        this.setDefaultTagMode(this.target.target, this.target.target.metric_type);

        if (this.target.target.colinput === 'text') {
          this.target.target.column = 'count(*)';
        } else if (this.target.target.columns.length > 0) {
          this.target.target.column = this.target.target.columns[0];
        } else {
          this.target.target.column = '';
        }

        this.target.tables = this.panel.targets[i].tables;
        this.target.tables_type = this.panel.targets[i].tables_type;
        this.scope.column.value = this.target.target.column;
        this.scope.column.list = this.panel.targets[i].target.columns;
        this.scope.metric.value = this.panel.targets[i].target.metric;

        break;
      }
    }
  }

  checkAvailableSameas() {
    var sRet = (this.panel.targets.length <= 1);
    
    return sRet;
  }

  setDefaultTagMode(aTarget, aType) {
    var sTagMode = aType === '6' ? 'Y' : 'N';

    aTarget.tag_mode = sTagMode;

    if (aTarget.pluginId === 'graph' || aTarget.pluginId === 'machgraph') {
      aTarget.xinput = 'time';
    }
  }

  ToggleTagMode() {
    this.target.target.tag_mode = this.target.target.tag_mode === 'Y' ? 'N' : 'Y';

    if (this.target.target.tag_mode !== 'Y' && this.target.target.colinput === 'text') {
      this.target.target.downsampling = '(NONE)';
    } else if (this.target.target.tag_mode === 'Y' && ['COUNT', 'AVG', 'SUM', 'MIN', 'MAX', '(NONE)'].indexOf(this.target.target.downsampling) < 0) {
      this.target.target.downsampling = 'COUNT';
    }

    if (this.target.target.pluginId === 'graph' || this.target.target.pluginId === 'machgraph') {
      this.target.target.xinput = 'time';
    } else {
      this.target.target.xinput = 'group';
      this.target.target.groupfield = '(NONE)';
      this.target.target.timefield = '';
    }
  }

  CheckQuerySchema() {
    var sRegs = [];
    var sVals = [];
    var sVariables = this.datasource.templateSrv.variables.filter(v => v.type !== 'datasource');

    this.datasource.MakeReplaceVariables(sVariables, {}, sRegs, sVals);

    var sQuery = this.target.target.query;

    for (var i = 0; i < sRegs.length; i++) {
      sQuery = sQuery.replace(sRegs[i], sVals[i]);
    }

    this.target.target.errors = {};

    if (sQuery.trim() === '') {
      this.target.target.errors.query = 'Input query statement';
      this.target.target.errors.last_error = this.target.target.errors.query;

      return false;
    } else if (sQuery.trim().substring(0, 6).toUpperCase() !== 'SELECT') {
      this.target.target.errors.query = 'Only the SELECT statement is possible';
      this.target.target.errors.last_error = this.target.target.errors.query;

      return false;
    }

    var ctrl = this;

    this.datasource._post('query/grafana4schema', { 'query': sQuery }).then(response => {
      if (response.$$status === 200) {
        if (response.length === 0 || response[0].type !== '12')
        {
          ctrl.target.target.errors.query = "The first column of the query results used in the graph should be in datetime format (Timestamp in nanoseconds)\n e.g. TO_TIMESTAMP(DATE_TRUNC('second', _arrival_time, 1))";
          ctrl.target.target.errors.last_error = ctrl.target.target.errors.query;
        }

        ctrl.refresh();
      }
    });
  }
}

MachbaseDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';