const { SampleDataLoader } = require('../dist/main/sample-data-loader.js');
const sqlite3 = require('better-sqlite3');
const path = require('path');
const os = require('os');

async function loadSampleData() {
  console.log('[LoadSampleData] Starting sample data load process...');
  
  // Get API keys from database
  const dbPath = path.join(os.homedir(), '.shopping-ai', 'app.db');
  console.log(`[LoadSampleData] Database path: ${dbPath}`);
  
  const db = new sqlite3(dbPath);
  
  try {
    // Get Algolia API keys
    const algoliaKeys = db.prepare(
      "SELECT value FROM api_configs WHERE service = 'algolia' AND key IN ('applicationId', 'writeApiKey')"
    ).all();
    
    if (algoliaKeys.length < 2) {
      console.error('[LoadSampleData] Algolia API keys not found in database. Please configure them in the app settings.');
      process.exit(1);
    }
    
    const config = {};
    algoliaKeys.forEach(row => {
      const data = JSON.parse(row.value);
      if (data.key === 'applicationId') config.applicationId = data.value;
      if (data.key === 'writeApiKey') config.writeApiKey = data.value;
    });
    
    console.log(`[LoadSampleData] Found Algolia config: App ID = ${config.applicationId}`);
    
    // Create loader and load data
    const loader = new SampleDataLoader(config.applicationId, config.writeApiKey);
    await loader.loadSampleData();
    
    console.log('[LoadSampleData] Sample data loaded successfully!');
  } catch (error) {
    console.error('[LoadSampleData] Error loading sample data:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the loader
loadSampleData().catch(error => {
  console.error('[LoadSampleData] Fatal error:', error);
  process.exit(1);
});