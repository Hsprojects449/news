// Simple Supabase connection test script
// Usage: node test-db-connection.js

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY in environment')
  process.exit(2)
}

const supabase = createClient(url, key)

async function run() {
  try {
    console.log('Using SUPABASE_URL:', url)
    // Run a lightweight query (adjust table name if your schema is different)
    const { data, error } = await supabase.from('admins').select('password').limit(2)
    if (error) {
      console.error('Query error:', error)
      process.exit(1)
    }
    console.log('Query succeeded. Sample rows:', data)
    process.exit(0)
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

run()
