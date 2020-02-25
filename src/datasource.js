import _ from 'lodash';
import kbn from 'app/core/utils/kbn';

export class MachbaseDatasource {
  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.sampling = '';
  }

  sqlQuery(aSql, aLimit) {
    var query = { 'query': aSql, 'limit': aLimit };
    var sRet = this.backendSrv.datasourceRequest({
      url: `${this.url}/query/grafana4sql`,
      data: query,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    return sRet;
  }

  query(options) {
    var sVariables = this.templateSrv.variables.filter(v => v.type !== 'datasource');
    var query = this.buildQueryParameters(options, sVariables);

    query.targets = query.targets.filter(t => !t.hide);

    var _options = options;
    var _this = this;

    return this.backendSrv.datasourceRequest({
      url: `${this.url}/query/grafana4`,
      data: query,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(response => {
      if (response.config.data.pluginid === 'machgraph' || response.config.data.pluginid === 'graph') {
        var sBgnTime = response.config.data.start_absolute;
        var sEndTime = response.config.data.end_absolute;
        var sGolbalAlert = null;
        var sGlobalTitle = '';
        var sGlobalCond = '';

        for (var i = 0; i < response.data.length; i++) {
          var sAlarm = [];

          if (response.data[i].hasOwnProperty('refId')) {
            var sRefId = response.data[i].refId;

            for (var j = 0; j < _options.targets.length; j++) {
              if (_options.targets[j].target.useAlert !== 'N' && sRefId === _options.targets[j].refId) {
                sAlarm = _options.targets[j].target.alerts;

                break;
              }
            }
          }
          else if (_options.targets[i].target.useAlert !== 'N') {
              sAlarm = _options.targets[i].target.alerts;
          }

          if (sAlarm.length > 0) {
            var sTempEvalType = { 'gt': 'is above ', 'lt': 'is below ', 'out': 'is outside range ', 'in': 'is within range ', 'no': 'has no value' };
            var sAlert = null;
            var sMsg = '';
            var sErroredCond = '';

            for (var j = 0; j < sAlarm.length; j++) {
              var sType = sAlarm[j].type;           // each | all
              var sReducer = sAlarm[j].reducer;    // avg, min, max, sum, count, cnt_null, cnt_not_null, last, diff, percent_diff, diff_minmax, median(reserved)
              var sRange = sAlarm[j].range.toLowerCase();
              var sOperator = sAlarm[j].operator;   // and | or
              var sEvaluator = sAlarm[j].evaluator; // { 'type':'gt', 'value1':0, 'value2':0 }
              var sFrom = 0;

              if (sRange !== 'all') {
                var range_regex = /(\d+)([hms])/;
                var sMatches = sRange.match(range_regex);

                if (sMatches.length > 1) {
                  sFrom = sEndTime - (parseInt(sMatches[0]) * (sMatches[1] === 's' ? 1 : (sMatches[1] === 'm' ? 60 : 60 * 60)) * 1000);
                }
              }

              var sValue = _this.calcAlertValue(sReducer, sFrom, response.data[i].datapoints);
              var sRes = _this.EvalAlert(sValue, sEvaluator);

              if (!sRes) continue;

              var sErrorMsg = sReducer + (sRange === 'all' ? '() of all datas' : `() of datas in ${sRange}`) + ` (${sValue.toString()}) ${sTempEvalType[sEvaluator.type]}`;
              
              switch (sEvaluator.type) {
                case 'gt':
                case 'lt':
                  sErrorMsg += Number(sEvaluator.value1).toString();
                  break;
                case 'out':
                case 'in':
                  sErrorMsg += `${Number(sEvaluator.value1).toString()} to ${Number(sEvaluator.value2).toString()}`;
                  break;
              }

              if (sType === 'each') {
                if (sAlert === null) {
                  sAlert = sRes;
                } else {
                  if (sOperator === 'and') {
                    sAlert = sAlert && sRes;
                  } else {
                    sAlert = sAlert || sRes;
                  }
                }

                if (sRes) {
                  if (sErroredCond !== '') {
                    sErroredCond += ` ${sOperator} `;
                  }
                  sErroredCond += sErrorMsg
                }
              } else {
                if (sGolbalAlert === null) {
                  sGolbalAlert = sRes;
                } else {
                  if (sOperator === 'and') {
                    sGolbalAlert = sGolbalAlert && sRes;
                  } else {
                    sGolbalAlert = sGolbalAlert || sRes;
                  }
                }

                if (sRes) {
                  if (sGlobalCond !== '') {
                    sGlobalCond += ` ${sOperator} `;
                    if (sGlobalTitle.indexOf(response.data[i].target) < 0) {
                      sGlobalTitle += ' & ';
                    }
                  }

                  sGlobalCond += `[${response.data[i].target}] ${sErrorMsg}`;
                  sGlobalTitle += `'${response.data[i].target}'`;
                }
              }
            }

            if (sAlert !== null && sAlert) {
              var TmpDate0 = new Date();
              var TmpDate1 = new Date(sBgnTime);
              var TmpDate2 = new Date(sEndTime);

              sMsg = 'Alert information.\n';
              sMsg += `Graph Title : ${response.data[i].target}\n`;
              sMsg += `Duration : ${TmpDate1.toLocaleString()} - ${TmpDate2.toLocaleString()}\n`;
              sMsg += `Alert Time : ${TmpDate0.toLocaleString()}\n`;
              sMsg += `Condition : ${sErroredCond}\n`;

              _this.backendSrv.alertSrv.set(`Alert in '${response.data[i].target}'`, sErroredCond, 'error', 7000);

              var sUrl = `${_this.url}/sendmail`;
              var sOptions = {
                subject: `Alert in '${response.data[i].target}'`,
                message: sMsg,
                range_begin: TmpDate1.toString(),
                range_end: TmpDate2.toString(),
                when: TmpDate0.toString(),
                cond: sErroredCond
              };

              //_this.backendSrv.get(sUrl, sOptions);
              _this.backendSrv.post(sUrl, sOptions);
            }
          }
        }

        if (sGolbalAlert !== null && sGolbalAlert) {
          var TmpDate0 = new Date();
          var TmpDate1 = new Date(sBgnTime);
          var TmpDate2 = new Date(sEndTime);

          sMsg  = 'Alert information.\n';
          sMsg += `Graph Title : ${sGlobalTitle}\n`;
          sMsg += `Duration : ${TmpDate1.toLocaleString()} - ${TmpDate2.toLocaleString()}\n`;
          sMsg += `Alert Time : ${TmpDate0.toLocaleString()}\n`;
          sMsg += `Condition : ${sGlobalCond}\n`;

          _this.backendSrv.alertSrv.set(`Alert in ${sGlobalTitle}`, sGlobalCond, 'error', 7000);

          var sUrl = `${_this.url}/sendmail`;
          var sOptions = {
            subject: `Alert in ${sGlobalTitle}`,
            message: sMsg,
            range_begin: TmpDate1.toString(),
            range_end: TmpDate2.toString(),
            when: TmpDate0.toString(),
            cond: sErroredCond
          };

          //_this.backendSrv.get(sUrl, sOptions);
          _this.backendSrv.post(sUrl, sOptions);
        }
      }

      return response;
    });
  }

  annotationQuery(options) {
    return [];
  }

  metricFindQuery(options) {
    var sQuery = options;
    var sRegs = [];
    var sVals = [];
    var sVariables = this.templateSrv.variables.filter(v => v.type !== 'datasource');

    this.MakeReplaceVariables(sVariables, {}, sRegs, sVals);

    for (var i = 0; i < sRegs.length; i++) {
        sQuery = sQuery.replace(sRegs[i], sVals[i]);
    }

    return this.backendSrv.datasourceRequest({
      url: `${this.url}/query/grafana4metric`,
      data: { 'query': sQuery },
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(response => response.data);
  }

  testDatasource() {
    return this.backendSrv.datasourceRequest({
      url: `${this.url}/`,
      method: 'GET'
    }).then(response => {
      if (response.status === 200) {
        return { status: "success", message: "Data source is working", title: "Success" };
      }
    });
  }

  buildQueryParameters(options, aVariables) {
    var _this = this;

    //remove empty targets
    options.targets = _.filter(options.targets, target => {
      return target.hasOwnProperty('target') && target.target.hasOwnProperty('metric') && _.isEmpty(target.target.errors)
          && (target.target.rawQuery || (target.target.metric !== '' && target.target.column !== ''))
          && (!target.target.rawQuery || target.target.query !== '');
    });

    // remove datasource variable and make regex
    var sRegs = [];
    var sVals = [];

    this.MakeReplaceVariables(aVariables, options, sRegs, sVals);

    var targets = _.map(options.targets, target => {
      var sFilters = _.map(target.target.filters, filter => {
        var sKey = filter.key;
        var sValue = filter.value;

        for (var i = 0; i < sRegs.length; i++) {
          sKey = sKey.replace(sRegs[i], sVals[i]);
          sValue = sValue.replace(sRegs[i], sVals[i]);
        }

        return {
          key: sKey,
          value: sValue,
          op: filter.op,
          numeric: filter.numeric,
          input: filter.input
        };
      });

      sFilters = _.filter(sFilters, f => f.key !== '--select column--' && f.value !== '');

      var sColumn = target.target.column;
      var sQuery = target.target.query;
      var sSampling = target.target.sampling;
      var sTargetName = target.target.targetname;
      var sOrderBy = target.target.orderby;
      var sDuration = target.target.duration;
      var sGroupField = target.target.groupfield;
      var sTimeField = target.target.timefield;
      var sMetric = target.target.metric;

      for (var i = 0; i < sRegs.length; i++) {
        sColumn = sColumn.replace(sRegs[i], sVals[i]);
        sQuery = sQuery.replace(sRegs[i], sVals[i]);
        sSampling = sSampling.replace(sRegs[i], sVals[i]);
        sTargetName = sTargetName.replace(sRegs[i], sVals[i]);
        sOrderBy = sOrderBy.replace(sRegs[i], sVals[i]);
        sDuration = sDuration.replace(sRegs[i], sVals[i]);
        sGroupField = sGroupField.replace(sRegs[i], sVals[i]);
        sTimeField = sTimeField.replace(sRegs[i], sVals[i]);
        sMetric = sMetric.replace(sRegs[i], sVals[i]);
      }

      return {
        colinput: target.target.colinput,
        column: !sColumn || sColumn.length === 0 ? '*' : sColumn,
        downsampling: target.target.downsampling,
        sampling: _this.convertToMachbaseInterval(sSampling),
        filters: sFilters,
        groupfield: sGroupField,
        hide: target.hide,
        limits: target.target.limit,
        metric: sMetric,
        metric_type: target.target.metric_type,
        tag_mode: target.target.tag_mode,
        name: sTargetName,
        query: sQuery,
        rawQuery: target.target.rawQuery,
        refId: target.refId,
        sameAs: target.target.sameAs,
        timefield: sTimeField,
        orderby: sOrderBy,
        xinput: target.target.xinput,
        useduration: target.target.useduration,
        duration: sDuration
      };
    });

    var sReturn = {};

    sReturn.targets = targets;
    sReturn.range = options.range;
    sReturn.start_absolute = options.range.from._d.getTime();
    sReturn.end_absolute = options.range.to._d.getTime();
    sReturn.interval = this.convertToMachbaseInterval(options.interval);
    sReturn.limits = options.maxDataPoints;
    sReturn.panelId = options.panelId;

    if (options.targets.length > 0) {
      sReturn.pluginid = options.targets[0].target.pluginId;
    }

    return sReturn;
  }

  MakeReplaceVariables(aVariables, aOptions, sRegs, sVals) {
    var _this = this;
    var sUseOption = aOptions.hasOwnProperty('range'); // use options?
    var sFrom = null;
    var sTo = null;
    var sSrvInterval = null;
    var sTempInterval = null;
    var sReg = null;

    if (aVariables.length > 1) {
      // sort variables by name length(desc)
      aVariables.sort((a, b) => b.name.length - a.name.length);
    }

    if (sUseOption) {
      sFrom = aOptions.range.from._d.getTime();
      sTo = aOptions.range.to._d.getTime();
      sSrvInterval = aOptions.interval;
    } else {
      if (this.templateSrv.hasOwnProperty('index') && this.templateSrv.index.hasOwnProperty('__from')) {
        sFrom = this.templateSrv.index.__from.current.value;
        sTo = this.templateSrv.index.__to.current.value;
      } else { // below ver 6.0($__from & $__to are supported from ver 6.0)
        sTo = new Date().getTime();     // only for check query(so now is ok)
        sFrom = sTo - 60000;            // now-1m
      }

      if (this.templateSrv.hasOwnProperty('builtIns') && this.templateSrv.builtIns.hasOwnProperty('__interval')) {
        sSrvInterval = this.templateSrv.builtIns.__interval.value;
      } else if (this.templateSrv.hasOwnProperty('_builtIns') && this.templateSrv._builtIns.hasOwnProperty('__interval')) {
        sSrvInterval = this.templateSrv._builtIns.__interval.value;
      } else {
        sSrvInterval = '1s';
      }
    }

    sTempInterval = this.convertToMachbaseInterval(sSrvInterval); // for test

    sReg = new RegExp(/\$__from_nano/, 'g');
    sRegs.push(sReg);
    sVals.push(sFrom * 1000000);  // nanosecond
    sReg = new RegExp(/\$__to_nano/, 'g');
    sRegs.push(sReg);
    sVals.push(sTo * 1000000);  // nanosecond
    sReg = new RegExp(/\$__interval_unit/, 'g');
    sRegs.push(sReg);
    sVals.push(sTempInterval.unit);   // interval
    sReg = new RegExp(/\$__interval_value/, 'g');
    sRegs.push(sReg);
    sVals.push(sTempInterval.value);  // interval
    sReg = new RegExp(/\$__from/, 'g');
    sRegs.push(sReg);
    sVals.push(sFrom);  // millisecond
    sReg = new RegExp(/\$__to/, 'g');
    sRegs.push(sReg);
    sVals.push(sTo);    // millisecond
    sReg = new RegExp(/\$__interval/, 'g');
    sRegs.push(sReg);
    sVals.push(sSrvInterval);  // interval

    var sVariables = _.filter(aVariables, aVar => {
      if (aVar.type !== 'datasource') {
        var sName = '\\$' + aVar.name + '|\\[\\[' + aVar.name + '\\]\\]';
        var sVal = aVar.current.value;

        if (typeof sVal === 'undefined') {
          sVal = '';
        } else if (typeof(sVal) !== 'string') {
          if (sVal.length > 0 && sVal[0] === '$__all') {
            sVal = aVar.query;
          } else {
            sVal = sVal.join(',');
          }
        } else if (sVal === `$__auto_interval_${aVar.name}`) {
          var sTemp = Math.round((sTo - sFrom) / aVar.auto_count);
          var sMinVar = _this.convertToMachbaseInterval(aVar.auto_min);

          if (sTemp < sMinVar.ms)
          {
            sTemp = sMinVar.ms;
          }

          if (sTemp % 3600000 === 0) {  // hour (360,000ms)
              sVal = parseInt(sTemp / 3600000).toString() + 'h';
          } else if (sTemp % 60000 === 0) {  // min (60,000ms)
              sVal = parseInt(sTemp / 60000).toString() + 'm';
          } else if (sTemp % 1000 === 0) {  // sec (1,000ms)
              sVal = parseInt(sTemp / 1000).toString() + 's';
          } else if (sTemp < 3000) {  // ms 3,000ms = 3sec
              sVal = sTemp.toString() + 'ms';
          } else if (sTemp <= 180000) {  // sec (180,000ms = 3min)
              sVal = parseInt(sTemp / 1000).toString() + 's';
          } else if (sTemp <= 10800000) {  // min (10,800,000ms = 3hour)
              sVal = parseInt(sTemp / 60000).toString() + 'm';
          } else if (sTemp <= 259200000) {  // hour (259,200,000ms = 3day)
              sVal = parseInt(sTemp / 3600000).toString() + 'h';
          } else { // day
              sVal = parseInt(sTemp / 86400000).toString() + 'd';
          }
        }

        var sReg = new RegExp(sName, 'g');

        sRegs.push(sReg);
        sVals.push(sVal);
      }

      return (aVar.type !== 'datasource');
    });

    return;
  }
}

MachbaseDatasource.prototype.convertToMachbaseInterval = intervalString => {
  if (intervalString === '') return { "value": 0, "unit": '', "input": '', "ms": 0 };

  var interval_regex = /(\d+(?:\.\d+)?)([Mwdhmsy])/;
  var interval_regex_ms = /(\d+(?:\.\d+)?)(ms)/;
  var matches = intervalString.match(interval_regex_ms);

  if(!matches) {
    matches = intervalString.match(interval_regex);
  }

  if (!matches) throw new Error('Invalid interval string, expecting a number followed by one of "y M w d h m s ms"');

  var value = matches[1];
  var unit = matches[2];
  var ms = Math.round(kbn.intervals_in_seconds[unit] * parseInt(value) * 1000);

  if (value % 1 !== 0) {
    if (unit === 'ms') throw new Error('Invalid interval value, cannot be smaller than the millisecond');

    value = ms;
    unit = 'ms';
  }

  switch(unit) {
    case 'ms':
      unit = 'msec';  // millisecond
      break;
    case 's':
      unit = 'second';
      break;
    case 'm':
      unit = 'minute';
      break;
    case 'h':
      unit = 'hour';
      break;
    case 'd':
      unit = 'day';
      break;
    case 'w':
      unit = 'week';
      break;
    case 'M':
      unit = 'month';
      break;
    case 'y':
      unit = 'year';
      break;
    default:
      console.log("Unknown interval ", intervalString);
      break;
  }

  return {
    "value": value,
    "unit": unit,
    "input": value.toString() + matches[2],
    "ms": ms
  };
};

MachbaseDatasource.prototype.calcAlertValue = (aReducer, aFrom, aDatas) => {
  var sReducer = aReducer;
  var sFrom = aFrom;
  var sDatas = aDatas;
  var sValue = null;

  if (sReducer === 'median') {
    // reserved
  } else {
    var sLId = sDatas.length - 1;  // last idx
    var sFId = -1;    // first idx
    var sBgn = null;  // not null first idx
    var sEnd = null;  // not null last idx
    var sBef = null;  // not null before last idx
    var sMin = null;
    var sMax = null;
    var sSum = 0;
    var sCnt = 0;
    var sNul = 0;

    for (var k = sLId; k >= 0; k--)
    {
      var sVal = sDatas[k];
      var sNum = Number(sVal[0]);
      var sTime = Number(sVal[1]);

      if (sTime <= sFrom) break;

      sFId = k;

      if (isNaN(sNum)) {
        sNul++;
      } else {
        if (sEnd === null) {
          sEnd = k;
          sMin = sNum;
          sMax = sNum;
        } else {
          if (sBef === null) {
            sBef = k;
          }
          
          if (sMin > sNum) {
            sMin = sNum;
          }
          
          if (sMax < sNum) {
            sMax = sNum;
          }
        }

        sBgn = k;

        if (sReducer === 'last') break;

        sSum += sNum;
      }

      sCnt++;
    }

    switch (sReducer) {
      case 'avg':
        if (sCnt > 0) {
          sValue = sSum / sCnt;
        }
        break;
      case 'min':
        sValue = sMin;
        break;
      case 'max':
        sValue = sMax;
        break;
      case 'sum':
        if (sCnt > 0) {
          sValue = sSum;
        }
        break;
      case 'count':
        sValue = sCnt;
        break;
      case 'cnt_null':
        sValue = sNul;
        break;
      case 'cnt_not_null':
        sValue = sCnt - sNul;
        break;
      case 'last':
        if (sEnd !== null) {
          sValue = Number(sDatas[sEnd][0]);
        }

        break;
      case 'diff':
        if (sEnd !== null && sBef !== null) {
          var sV1 = Number(sDatas[sEnd][0]);
          var sV2 = Number(sDatas[sBef][0]);

          if (sV1 < sV2) {
            sV1 = Number(sDatas[sBef][0]);
            sV2 = Number(sDatas[sEnd][0]);
          }

          sValue = sV1 - sV2;
        }

        break;
      case 'percent_diff':
        if (sEnd !== null && sBef !== null) {
          var sV1 = Number(sDatas[sEnd][0]);
          var sV2 = Number(sDatas[sBef][0]);

          if (sV1 < sV2) {
            sV1 = Number(sDatas[sBef][0]);
            sV2 = Number(sDatas[sEnd][0]);
          }

          sValue = (sV1 - sV2) / ((sV1 + sV2) / 2) * 100.0;
        }

        break;
      case 'diff_minmax':
        if (sEnd !== null) {
          sValue = sMax - sMin;
        }

        break;
    }
  }

  return sValue;
};

MachbaseDatasource.prototype.EvalAlert = (aValue, aEvaluator) => {
  var sValue = aValue;

  if (sValue === null)
  {
    sValue = NaN; // isNaN(null) -> false, Number(null) -> 0
  }

  var sRes = false;
  var sVal1 = Number(aEvaluator.value1);
  var sVal2 = Number(aEvaluator.value2);
  var sType = aEvaluator.type;

  switch (sType) // is above(gt), is below(lt), is outside range{out}, is within range{in}, has no value{no}
  {
    case 'gt':
      sRes = (!isNaN(sValue) && !isNaN(sVal1) && sValue > sVal1);
      break;
    case 'lt':
      sRes = (!isNaN(sValue) && !isNaN(sVal1) && sValue < sVal1);
      break;
    case 'out':
      if (!isNaN(sValue) && !isNaN(sVal1) && !isNaN(sVal2))
      {
        sRes = ((sValue < sVal1 && sValue < sVal2) || (sValue > sVal1 && sValue > sVal2));
      }

      break;
    case 'in':
      if (!isNaN(sValue) && !isNaN(sVal1) && !isNaN(sVal2))
      {
        sRes = ((sValue < sVal1 && sValue > sVal2) || (sValue > sVal1 && sValue < sVal2));
      }

      break;
    case 'no':
      sRes = isNaN(sValue);
      break;
  }

  return sRes;
};

MachbaseDatasource.prototype._request = function(method, url, data) {
    var options = {
        url: `${this.url}/${url}`,
        method: method,
        data: data,
        headers: { "Content-Type": "application/json" }
    };

    return this.backendSrv.datasourceRequest(options)
        .then(response => {
          response.data.$$status = response.status;
          response.data.$$config = response.config;
          
          return response.data;
      });
};

MachbaseDatasource.prototype._get = function(url) {
    if (url === void 0) url = "";
    
    return this._request('GET', url);
};

MachbaseDatasource.prototype._post = function(url, data) {
    return this._request('POST', url, data);
};