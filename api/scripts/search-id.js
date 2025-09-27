const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../.tmp/data.db');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function searchIdInTables(idToSearch) {
    let db;
    try {
        db = new Database(dbPath, { readonly: true });
        log('blue', `Connected to SQLite database for read-only search`);

        const tablesToSearch = [
            'files',
            'projects',
            'categories',
            'abouts',
            'globals',
            'components_shared_media',
            'files_related_mph' // Many-to-many relationship for files
        ];

        log('blue', `Searching for ID ${idToSearch} in relevant tables...\n`);

        let found = false;

        for (const tableName of tablesToSearch) {
            try {
                const query = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
                const row = query.get(idToSearch);

                if (row) {
                    log('green', `✅ Found ID ${idToSearch} in table: ${tableName}`);
                    log('green', `   Data: ${JSON.stringify(row, null, 2)}\n`);
                    found = true;
                }
            } catch (err) {
                // This catches errors if a table doesn't have an 'id' column or doesn't exist
                // For a selective list of tables, this should be less frequent.
                // We'll log it as a warning if it's not the 'files' table for a missing ID
                log('yellow', `  - Could not query table ${tableName} for ID ${idToSearch}: ${err.message}`);
            }
        }

        if (!found) {
            log('yellow', `No record with ID ${idToSearch} found in the selected tables.`);
        }

    } catch (error) {
        log('red', `Database error: ${error.message}`);
        process.exit(1);
    } finally {
        if (db) {
            db.close();
            log('blue', '\nDatabase connection closed');
        }
    }
}

const targetId = 1805;
log('blue', '=== Search Database for ID Script ===');
searchIdInTables(targetId).then(() => {
    log('blue', '\n=== Script completed ===');
});
