import { NextResponse } from 'next/server'
import { supabase, hasSupabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    console.log('Starting admin reset migration...')
    
    if (!hasSupabase() || !supabase) {
      return NextResponse.json({ 
        success: false, 
        message: 'Database not configured' 
      }, { status: 500 })
    }
    
    // Step 1: Delete all existing admin users
    const { error: deleteError } = await supabase
      .from('admins')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records
    
    if (deleteError) {
      console.error('Error deleting existing admins:', deleteError)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to delete existing admins',
        error: deleteError 
      }, { status: 500 })
    }

    console.log('Existing admins deleted successfully')

    // Step 2: Create new admin user
    const newAdmin = {
      username: 'admin',
      password: '$2b$10$6BwZJc83gTufFXwb0C61aOE9.3BOY/7/21MdsuceDEGiQlnvPXPGu', // Newsadmin@2025
      role: 'super_admin'
    }

    const { data: insertData, error: insertError } = await supabase
      .from('admins')
      .insert([newAdmin])
      .select('id, username, role, created_at')

    if (insertError) {
      console.error('Error creating new admin:', insertError)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to create new admin',
        error: insertError 
      }, { status: 500 })
    }

    console.log('New admin created successfully:', insertData)

    // Step 3: Verify the admin was created
    const { data: verifyData, error: verifyError } = await supabase
      .from('admins')
      .select('id, username, role, created_at')

    if (verifyError) {
      console.error('Error verifying admin creation:', verifyError)
    }

    return NextResponse.json({
      success: true,
      message: 'Admin reset completed successfully',
      newAdmin: insertData?.[0],
      allAdmins: verifyData,
      credentials: {
        username: 'admin',
        password: 'Newsadmin@2025'
      }
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Server error during admin reset',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
