import { MachbaseDatasource } from './datasource';
import { MachbaseDatasourceQueryCtrl } from './query_ctrl';

class MachbaseConfigCtrl {}
MachbaseConfigCtrl.templateUrl = 'partials/config.html';

class MachbaseQueryOptionsCtrl {}
MachbaseQueryOptionsCtrl.templateUrl = 'partials/query.options.html';

export {
  MachbaseDatasource as Datasource,
  MachbaseDatasourceQueryCtrl as QueryCtrl,
  MachbaseConfigCtrl as ConfigCtrl,
  MachbaseQueryOptionsCtrl as QueryOptionsCtrl,
};
