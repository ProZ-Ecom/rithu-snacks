const fs = require('fs');
const mariadb = require('mariadb');
require('dotenv').config();

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in .env');
  }

  const url = new URL(databaseUrl);
  const host = url.hostname || 'localhost';
  const port = Number(url.port || 3306);
  const user = decodeURIComponent(url.username || 'root');
  const password = decodeURIComponent(url.password || '');
  const database = url.pathname.slice(1) || 'rithusnack_new';

  console.log(`Connecting to MySQL server at ${host}:${port}...`);
  try { \n    const rootConn = await mariadb.createConnection({ \n      host, \n      port, \n      user, \n      password, \n      allowPublicKeyRetrieval: true, \n      connectTimeout: 5000, \n }); \n    await rootConn.query(CREATE DATABASE IF NOT EXISTS \${ database }\ CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;); \n    console.log(Database \${ database }\ ready.); \n    await rootConn.end(); \n } catch (err) { \n    console.log(Note: Database already exists or root CREATE DATABASE skipped.Connecting to \${ database }\...); \n }

  const conn = await mariadb.createConnection({
    host,
    port,
    user,
    password,
    database,
    allowPublicKeyRetrieval: true,
    multipleStatements: true,
  });

  console.log(`Reading prisma/schema.prisma...`);
  const content = fs.readFileSync('prisma/schema.prisma', 'utf8');

  // 1. Parse Enums
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  const enums = {};
  let m;
  while ((m = enumRegex.exec(content)) !== null) {
    const enumName = m[1];
    const values = m[2].trim().split(/\s+/).filter(Boolean);
    enums[enumName] = values;
  }

  // 2. Parse Models
  const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  const tables = [];

  while ((m = modelRegex.exec(content)) !== null) {
    const modelName = m[1];
    const body = m[2];

    let tableName = modelName;
    const tableMapMatch = body.match(/@@map\("([^"]+)"\)/);
    if (tableMapMatch) {
      tableName = tableMapMatch[1];
    }

    const columns = [];
    const tableIndices = [];
    const tableUniques = [];
    const foreignKeys = [];
    let primaryKeys = [];

    const lines = body.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//')) continue;

      if (line.startsWith('@@id(')) {
        const idFields = line.match(/@@id\(\[([^\]]+)\]/);
        if (idFields) {
          primaryKeys = idFields[1].split(',').map(s => s.trim().replace(/"/g, ''));
        }
        continue;
      }

      if (line.startsWith('@@unique(')) {
        const uFields = line.match(/@@unique\(\[([^\]]+)\](?:,\s*map:\s*"([^"]+)")?/);
        if (uFields) {
          const fields = uFields[1].split(',').map(s => s.trim().replace(/"/g, ''));
          const mapName = uFields[2] || `uq_${tableName}_${fields.join('_')}`;
          tableUniques.push({ fields, mapName });
        }
        continue;
      }

      if (line.startsWith('@@index(')) {
        const idxMatch = line.match(/@@index\(\[([^\]]+)\](?:,\s*map:\s*"([^"]+)")?/);
        if (idxMatch) {
          const fields = idxMatch[1].split(',').map(s => s.trim().replace(/"/g, ''));
          const mapName = idxMatch[2] || `idx_${tableName}_${fields.join('_')}`;
          tableIndices.push({ fields, mapName });
        }
        continue;
      }

      if (line.startsWith('@@')) continue;

      // Parse column line
      const parts = line.split(/\s+/);
      const fieldName = parts[0];
      const fieldType = parts[1];

      // If field type is another model (relation)
      if (line.includes('@relation(')) {
        const relMatch = line.match(/@relation\(([^)]+)\)/);
        if (relMatch) {
          const relContent = relMatch[1];
          const fieldsMatch = relContent.match(/fields:\s*\[([^\]]+)\]/);
          const referencesMatch = relContent.match(/references:\s*\[([^\]]+)\]/);
          const mapMatch = relContent.match(/map:\s*"([^"]+)"/);
          const onDeleteMatch = relContent.match(/onDelete:\s*(\w+)/);
          const onUpdateMatch = relContent.match(/onUpdate:\s*(\w+)/);

          if (fieldsMatch && referencesMatch) {
            foreignKeys.push({
              field: fieldsMatch[1].trim(),
              targetModel: fieldType.replace('?', '').replace('[]', ''),
              targetField: referencesMatch[1].trim(),
              fkName: mapMatch ? mapMatch[1] : null,
              onDelete: onDeleteMatch ? onDeleteMatch[1] : null,
              onUpdate: onUpdateMatch ? onUpdateMatch[1] : null,
            });
          }
        }
        // If it's a pure relation field (not scalar), don't treat as a DB column
        if (!line.includes('@db.') && !['String', 'Int', 'BigInt', 'Boolean', 'DateTime', 'Decimal', 'Float', 'Json', 'Bytes'].includes(fieldType.replace('?', ''))) {
          continue;
        }
      } else if (!line.includes('@db.') && !enums[fieldType.replace('?', '')] && !['String', 'Int', 'BigInt', 'Boolean', 'DateTime', 'Decimal', 'Float', 'Json', 'Bytes'].includes(fieldType.replace('?', ''))) {
        // Relation field with no @relation attribute (e.g. users User[])
        continue;
      }

      let colName = fieldName;
      const mapMatch = line.match(/@map\("([^"]+)"\)/);
      if (mapMatch) {
        colName = mapMatch[1];
      }

      const isOptional = fieldType.includes('?');
      const isId = line.includes('@id');
      const isAutoIncrement = line.includes('@default(autoincrement())');
      const isUnique = line.includes('@unique');

      let sqlColType = 'VARCHAR(255)';
      const dbTypeMatch = line.match(/@db\.(\w+)(?:\(([^)]+)\))?/);
      if (dbTypeMatch) {
        const dbType = dbTypeMatch[1].toUpperCase();
        const dbArgs = dbTypeMatch[2];
        if (dbType === 'UNSIGNEDBIGINT') sqlColType = 'BIGINT UNSIGNED';
        else if (dbType === 'UNSIGNEDINT') sqlColType = 'INT UNSIGNED';
        else if (dbType === 'UNSIGNEDSMALLINT') sqlColType = 'SMALLINT UNSIGNED';
        else if (dbType === 'UNSIGNEDTINYINT') sqlColType = 'TINYINT UNSIGNED';
        else if (dbType === 'VARCHAR') sqlColType = `VARCHAR(${dbArgs || 255})`;
        else if (dbType === 'CHAR') sqlColType = `CHAR(${dbArgs || 255})`;
        else if (dbType === 'TEXT') sqlColType = 'TEXT';
        else if (dbType === 'LONGTEXT') sqlColType = 'LONGTEXT';
        else if (dbType === 'MEDIUMTEXT') sqlColType = 'MEDIUMTEXT';
        else if (dbType === 'TINYTEXT') sqlColType = 'TINYTEXT';
        else if (dbType === 'DECIMAL') sqlColType = `DECIMAL(${dbArgs || '10, 2'})`;
        else if (dbType === 'TIMESTAMP') sqlColType = `TIMESTAMP${dbArgs !== undefined ? `(${dbArgs})` : ''}`;
        else if (dbType === 'DATETIME') sqlColType = `DATETIME${dbArgs !== undefined ? `(${dbArgs})` : ''}`;
        else if (dbType === 'DOUBLE') sqlColType = 'DOUBLE';
        else if (dbType === 'FLOAT') sqlColType = 'FLOAT';
        else if (dbType === 'BOOLEAN' || dbType === 'TINYINT') sqlColType = 'TINYINT(1)';
        else if (dbType === 'INT') sqlColType = 'INT';
        else if (dbType === 'BIGINT') sqlColType = 'BIGINT';
        else if (dbType === 'JSON') sqlColType = 'JSON';
        else sqlColType = dbArgs ? `${dbType}(${dbArgs})` : dbType;
      } else {
        const cleanType = fieldType.replace('?', '');
        if (enums[cleanType]) {
          const vals = enums[cleanType].map(v => `'${v}'`).join(', ');
          sqlColType = `ENUM(${vals})`;
        } else if (cleanType === 'String') {
          sqlColType = 'VARCHAR(255)';
        } else if (cleanType === 'Int') {
          sqlColType = 'INT';
        } else if (cleanType === 'BigInt') {
          sqlColType = 'BIGINT';
        } else if (cleanType === 'Boolean') {
          sqlColType = 'TINYINT(1)';
        } else if (cleanType === 'DateTime') {
          sqlColType = 'DATETIME';
        } else if (cleanType === 'Decimal' || cleanType === 'Float') {
          sqlColType = 'DECIMAL(10, 2)';
        } else if (cleanType === 'Json') {
          sqlColType = 'JSON';
        }
      }

      let colDef = `\`${colName}\` ${sqlColType}`;
      if (!isOptional && !isId) {
        colDef += ' NOT NULL';
      } else if (isId) {
        colDef += ' NOT NULL';
      } else {
        colDef += ' NULL';
      }

      if (isAutoIncrement) {
        colDef += ' AUTO_INCREMENT';
      }

      // Default value
      const defaultMatch = line.match(/@default\(([^)]+)\)/);
      if (defaultMatch && !isAutoIncrement) {
        const defVal = defaultMatch[1].trim();
        if (defVal === 'now()') {
          colDef += ' DEFAULT CURRENT_TIMESTAMP';
        } else if (defVal.startsWith('"') || defVal.startsWith("'")) {
          const val = defVal.replace(/^["']|["']$/g, '');
          if (val === 'UUID()') {
            // keep as default or null
          } else {
            colDef += ` DEFAULT '${val}'`;
          }
        } else if (defVal === 'true') {
          colDef += ' DEFAULT 1';
        } else if (defVal === 'false') {
          colDef += ' DEFAULT 0';
        } else if (!isNaN(Number(defVal))) {
          colDef += ` DEFAULT ${defVal}`;
        } else if (enums[fieldType.replace('?', '')]) {
          colDef += ` DEFAULT '${defVal}'`;
        }
      }

      if (line.includes('@updatedAt')) {
        colDef += ' ON UPDATE CURRENT_TIMESTAMP';
      }

      columns.push({
        colName,
        fieldName,
        colDef,
        isId,
        isUnique,
      });

      if (isId && primaryKeys.length === 0) {
        primaryKeys.push(colName);
      }
    }

    tables.push({
      modelName,
      tableName,
      columns,
      primaryKeys,
      tableIndices,
      tableUniques,
      foreignKeys,
    });
  }

  console.log(`Parsed ${tables.length} tables from schema.`);

  // Model name to table name lookup
  const modelToTable = {};
  for (const t of tables) {
    modelToTable[t.modelName] = t.tableName;
  }

  // Field name to col name lookup for each model
  const fieldToCol = {};
  for (const t of tables) {
    fieldToCol[t.modelName] = {};
    for (const c of t.columns) {
      fieldToCol[t.modelName][c.fieldName] = c.colName;
    }
  }

  // Disable FK checks during schema creation
  await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

  for (const t of tables) {
    const colDefs = t.columns.map(c => c.colDef);
    if (t.primaryKeys.length > 0) {
      const pks = t.primaryKeys.map(k => `\`${fieldToCol[t.modelName]?.[k] || k}\``).join(', ');
      colDefs.push(`PRIMARY KEY (${pks})`);
    }

    const createSql = `CREATE TABLE IF NOT EXISTS \`${t.tableName}\` (\n  ${colDefs.join(',\n  ')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

    try {
      await conn.query(createSql);
      // Ensure any newly added columns exist in already-created tables
      const existingDbCols = await conn.query(`DESCRIBE \`${t.tableName}\``);
      const existingColMap = new Map(existingDbCols.map(c => [c.Field, c]));
      for (const col of t.columns) {
        if (!existingColMap.has(col.colName)) {
          try {
            await conn.query(`ALTER TABLE \`${t.tableName}\` ADD COLUMN ${col.colDef};`);
            console.log(`✓ Added missing column \`${t.tableName}\`.\`${col.colName}\``);
          } catch (colErr) {
            console.warn(`Could not add column \`${t.tableName}\`.\`${col.colName}\`:`, colErr.message);
          }
        } else if (col.colDef.includes('ENUM(')) {
          const dbCol = existingColMap.get(col.colName);
          const enumMatch = col.colDef.match(/ENUM\([^)]+\)/i);
          if (enumMatch && dbCol.Type.toLowerCase() !== enumMatch[0].toLowerCase()) {
            try {
              await conn.query(`ALTER TABLE \`${t.tableName}\` MODIFY COLUMN ${col.colDef};`);
              console.log(`✓ Updated ENUM column \`${t.tableName}\`.\`${col.colName}\``);
            } catch (enumErr) {
              console.warn(`Could not update ENUM \`${t.tableName}\`.\`${col.colName}\`:`, enumErr.message);
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error creating table \`${t.tableName}\`:`, err.message);
    }
  }

  console.log(`All tables created. Creating indexes and constraints...`);

  // Create unique constraints & indexes
  for (const t of tables) {
    // Unique columns
    for (const c of t.columns) {
      if (c.isUnique) {
        const uName = `uq_${t.tableName}_${c.colName}`;
        try {
          await conn.query(`ALTER TABLE \`${t.tableName}\` ADD UNIQUE KEY \`${uName}\` (\`${c.colName}\`);`);
        } catch (e) {
          // ignore already exists
        }
      }
    }

    // @@unique
    for (const u of t.tableUniques) {
      const cols = u.fields.map(f => `\`${fieldToCol[t.modelName]?.[f] || f}\``).join(', ');
      try {
        await conn.query(`ALTER TABLE \`${t.tableName}\` ADD UNIQUE KEY \`${u.mapName}\` (${cols});`);
      } catch (e) {
        // ignore already exists
      }
    }

    // @@index
    for (const idx of t.tableIndices) {
      const cols = idx.fields.map(f => `\`${fieldToCol[t.modelName]?.[f] || f}\``).join(', ');
      try {
        await conn.query(`ALTER TABLE \`${t.tableName}\` ADD INDEX \`${idx.mapName}\` (${cols});`);
      } catch (e) {
        // ignore already exists
      }
    }
  }

  // Create Foreign Keys
  for (const t of tables) {
    for (const fk of t.foreignKeys) {
      const targetTable = modelToTable[fk.targetModel] || fk.targetModel;
      const srcCol = fieldToCol[t.modelName]?.[fk.field] || fk.field;
      const targetCol = fieldToCol[fk.targetModel]?.[fk.targetField] || fk.targetField;
      const fkName = fk.fkName || `fk_${t.tableName}_${srcCol}`;

      let action = '';
      if (fk.onDelete && fk.onDelete !== 'NoAction') {
        action += ` ON DELETE ${fk.onDelete === 'Cascade' ? 'CASCADE' : fk.onDelete === 'SetNull' ? 'SET NULL' : 'RESTRICT'}`;
      }
      if (fk.onUpdate && fk.onUpdate !== 'NoAction') {
        action += ` ON UPDATE ${fk.onUpdate === 'Cascade' ? 'CASCADE' : fk.onUpdate === 'SetNull' ? 'SET NULL' : 'RESTRICT'}`;
      }

      try {
        await conn.query(`ALTER TABLE \`${t.tableName}\` ADD CONSTRAINT \`${fkName}\` FOREIGN KEY (\`${srcCol}\`) REFERENCES \`${targetTable}\` (\`${targetCol}\`)${action};`);
      } catch (e) {
        // ignore if already exists or constraint duplicate
      }
    }
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('✓ Database schema sync completed successfully!');
  await conn.end();
}

run().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
