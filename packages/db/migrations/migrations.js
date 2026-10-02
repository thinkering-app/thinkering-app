// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_marvelous_living_mummy.sql';
import m0001 from './0001_sleepy_strong_guy.sql';
import m0002 from './0002_add_interest_success_outcomes.sql';
import m0003 from './0003_add_activity_focus.sql';
import m0004 from './0004_wandering_ma_gnuci.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004
    }
  }
  