// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_marvelous_living_mummy.sql';
import m0001 from './0001_sleepy_strong_guy.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001
    }
  }
  