import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DemoRequest {
  action: 'fill_all' | 'reset_all' | 'reset_category'
  category?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin or vorstand
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    const hasPermission = roles?.some(r => r.role === 'admin' || r.role === 'vorstand')
    if (!hasPermission) {
      throw new Error('Insufficient permissions')
    }

    const { action, category }: DemoRequest = await req.json()

    console.log(`Demo management action: ${action}`, category ? `category: ${category}` : '')

    switch (action) {
      case 'fill_all':
        await fillDemoData(supabaseClient)
        break
      case 'reset_category':
        if (!category) throw new Error('Category required for reset_category action')
        await resetCategory(supabaseClient, category)
        break
      case 'reset_all':
        await resetAll(supabaseClient)
        break
      default:
        throw new Error('Invalid action')
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in demo-management:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function fillDemoData(supabase: any) {
  console.log('Filling demo data...')
  
  // Demo member data
  const demoMembers = [
    { firstName: 'Max', lastName: 'Mustermann', email: 'max.mustermann@demo.de', phone: '0123-456789', birthday: '1985-03-15', memberNumber: 'M001' },
    { firstName: 'Anna', lastName: 'Schmidt', email: 'anna.schmidt@demo.de', phone: '0123-456790', birthday: '1992-07-22', memberNumber: 'M002' },
    { firstName: 'Thomas', lastName: 'Müller', email: 'thomas.mueller@demo.de', phone: '0123-456791', birthday: '1988-11-30', memberNumber: 'M003' },
    { firstName: 'Sarah', lastName: 'Weber', email: 'sarah.weber@demo.de', phone: '0123-456792', birthday: '1995-02-18', memberNumber: 'M004' },
    { firstName: 'Michael', lastName: 'Wagner', email: 'michael.wagner@demo.de', phone: '0123-456793', birthday: '1990-05-25', memberNumber: 'M005' },
    { firstName: 'Julia', lastName: 'Becker', email: 'julia.becker@demo.de', phone: '0123-456794', birthday: '1993-09-10', memberNumber: 'M006' },
    { firstName: 'Daniel', lastName: 'Hoffmann', email: 'daniel.hoffmann@demo.de', phone: '0123-456795', birthday: '1987-12-05', memberNumber: 'M007' },
    { firstName: 'Lisa', lastName: 'Fischer', email: 'lisa.fischer@demo.de', phone: '0123-456796', birthday: '1991-04-20', memberNumber: 'M008' },
    { firstName: 'Martin', lastName: 'Schulz', email: 'martin.schulz@demo.de', phone: '0123-456797', birthday: '1989-08-14', memberNumber: 'M009' },
    { firstName: 'Sophie', lastName: 'Klein', email: 'sophie.klein@demo.de', phone: '0123-456798', birthday: '1994-01-28', memberNumber: 'M010' },
  ]

  const createdUserIds: string[] = []
  
  // Create demo members with authentication
  for (const member of demoMembers) {
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: member.email,
        email_confirm: true,
        password: 'Demo2025!',
        user_metadata: {
          first_name: member.firstName,
          last_name: member.lastName,
          requires_password_change: false
        }
      })

      if (authError) {
        console.error(`Error creating user ${member.email}:`, authError)
        continue
      }

      if (authData.user) {
        createdUserIds.push(authData.user.id)
        
        // Update profile with additional data
        await supabase
          .from('profiles')
          .update({
            phone: member.phone,
            birthday: member.birthday,
            member_number: member.memberNumber,
            status: 'active'
          })
          .eq('user_id', authData.user.id)
      }
    } catch (error) {
      console.error(`Error creating member ${member.email}:`, error)
    }
  }

  console.log(`Created ${createdUserIds.length} demo members`)

  // Create demo teams
  const teams = [
    {
      name: 'Herren 1',
      league: 'Verbandsliga',
      division: 'Nord',
      season_id: '2024/25',
      training_slots: [
        { day: 'Montag', time: '19:00-21:00' },
        { day: 'Mittwoch', time: '19:00-21:00' }
      ],
      home_match: { day: 'Samstag', time: '18:00' }
    },
    {
      name: 'Herren 2',
      league: 'Bezirksliga',
      division: 'Gruppe A',
      season_id: '2024/25',
      training_slots: [
        { day: 'Dienstag', time: '19:00-21:00' }
      ],
      home_match: { day: 'Freitag', time: '19:30' }
    },
    {
      name: 'Herren 3',
      league: 'Kreisliga A',
      division: 'Staffel 2',
      season_id: '2024/25',
      training_slots: [
        { day: 'Donnerstag', time: '19:00-21:00' }
      ],
      home_match: { day: 'Samstag', time: '14:00' }
    },
    {
      name: 'Damen 1',
      league: 'Bezirksliga',
      division: 'Gruppe B',
      season_id: '2024/25',
      training_slots: [
        { day: 'Montag', time: '18:00-20:00' },
        { day: 'Freitag', time: '18:00-20:00' }
      ],
      home_match: { day: 'Sonntag', time: '10:00' }
    },
    {
      name: 'Jugend U18',
      league: 'Bezirksoberliga Jugend',
      division: 'Gruppe 1',
      season_id: '2024/25',
      training_slots: [
        { day: 'Mittwoch', time: '17:00-19:00' },
        { day: 'Freitag', time: '17:00-19:00' }
      ],
      home_match: { day: 'Samstag', time: '16:00' }
    }
  ]

  const { data: createdTeams } = await supabase
    .from('teams')
    .insert(teams)
    .select()

  console.log(`Created ${createdTeams?.length || 0} demo teams`)

  // Assign members to teams
  if (createdTeams && createdTeams.length > 0 && demoMembers.length > 0) {
    const teamMembers = []
    
    // Herren 1 - 4 Spieler
    for (let i = 0; i < Math.min(4, demoMembers.length); i++) {
      teamMembers.push({
        team_id: createdTeams[0].id,
        member_id: demoMembers[i].memberNumber,
        is_captain: i === 0
      })
    }
    
    // Herren 2 - 4 Spieler
    for (let i = 4; i < Math.min(8, demoMembers.length); i++) {
      if (createdTeams.length > 1) {
        teamMembers.push({
          team_id: createdTeams[1].id,
          member_id: demoMembers[i].memberNumber,
          is_captain: i === 4
        })
      }
    }

    // Herren 3 - 2 Spieler
    if (createdTeams.length > 2 && demoMembers.length > 8) {
      teamMembers.push({
        team_id: createdTeams[2].id,
        member_id: demoMembers[8].memberNumber,
        is_captain: true
      })
      if (demoMembers.length > 9) {
        teamMembers.push({
          team_id: createdTeams[2].id,
          member_id: demoMembers[9].memberNumber,
          is_captain: false
        })
      }
    }

    await supabase.from('team_members').insert(teamMembers)
    console.log(`Assigned ${teamMembers.length} members to teams`)
  }

  // Create comprehensive demo match schedule
  const matches = [
    // Herren 1 - vergangene Spiele
    {
      team: 'Herren 1',
      opponent: 'TTC Musterstadt',
      date: '2025-01-11',
      time: '18:00',
      location: 'Zaberfeld Sporthalle',
      status: 'completed',
      home_score: 9,
      away_score: 7
    },
    {
      team: 'Herren 1',
      opponent: 'TSV Winnenden',
      date: '2025-01-18',
      time: '19:00',
      location: 'Winnenden Sporthalle',
      status: 'completed',
      home_score: 5,
      away_score: 11
    },
    {
      team: 'Herren 1',
      opponent: 'SV Heilbronn',
      date: '2025-01-25',
      time: '18:00',
      location: 'Zaberfeld Sporthalle',
      status: 'completed',
      home_score: 10,
      away_score: 6
    },
    // Herren 1 - kommende Spiele
    {
      team: 'Herren 1',
      opponent: 'SV Beispielheim',
      date: '2025-02-08',
      time: '18:00',
      location: 'Zaberfeld Sporthalle',
      status: 'scheduled'
    },
    {
      team: 'Herren 1',
      opponent: 'TTC Stuttgart',
      date: '2025-02-15',
      time: '19:30',
      location: 'Stuttgart Sporthalle',
      status: 'scheduled'
    },
    {
      team: 'Herren 1',
      opponent: 'TSG Backnang',
      date: '2025-02-22',
      time: '18:00',
      location: 'Zaberfeld Sporthalle',
      status: 'scheduled'
    },
    // Herren 2 - vergangene Spiele
    {
      team: 'Herren 2',
      opponent: 'TSV Testdorf',
      date: '2025-01-12',
      time: '19:30',
      location: 'Zaberfeld Sporthalle',
      status: 'completed',
      home_score: 6,
      away_score: 10
    },
    {
      team: 'Herren 2',
      opponent: 'TV Oberstenfeld',
      date: '2025-01-19',
      time: '19:00',
      location: 'Oberstenfeld Halle',
      status: 'completed',
      home_score: 8,
      away_score: 8
    },
    // Herren 2 - kommende Spiele
    {
      team: 'Herren 2',
      opponent: 'SV Beilstein',
      date: '2025-02-09',
      time: '19:30',
      location: 'Zaberfeld Sporthalle',
      status: 'scheduled'
    },
    {
      team: 'Herren 2',
      opponent: 'TSV Abstatt',
      date: '2025-02-16',
      time: '18:30',
      location: 'Abstatt Gemeindehalle',
      status: 'scheduled'
    },
    // Herren 3 Spiele
    {
      team: 'Herren 3',
      opponent: 'TTC Löchgau',
      date: '2025-01-13',
      time: '14:00',
      location: 'Zaberfeld Sporthalle',
      status: 'completed',
      home_score: 9,
      away_score: 9
    },
    {
      team: 'Herren 3',
      opponent: 'SV Großbottwar',
      date: '2025-02-10',
      time: '14:00',
      location: 'Zaberfeld Sporthalle',
      status: 'scheduled'
    },
    // Damen 1 Spiele
    {
      team: 'Damen 1',
      opponent: 'TTC Vaihingen',
      date: '2025-01-14',
      time: '10:00',
      location: 'Zaberfeld Sporthalle',
      status: 'completed',
      home_score: 7,
      away_score: 9
    },
    {
      team: 'Damen 1',
      opponent: 'TSV Markgröningen',
      date: '2025-02-11',
      time: '10:00',
      location: 'Zaberfeld Sporthalle',
      status: 'scheduled'
    },
    // Jugend U18 Spiele
    {
      team: 'Jugend U18',
      opponent: 'TTC Brackenheim',
      date: '2025-01-20',
      time: '16:00',
      location: 'Zaberfeld Sporthalle',
      status: 'completed',
      home_score: 10,
      away_score: 6
    },
    {
      team: 'Jugend U18',
      opponent: 'SV Nordheim',
      date: '2025-02-17',
      time: '16:00',
      location: 'Zaberfeld Sporthalle',
      status: 'scheduled'
    }
  ]

  await supabase.from('matches').insert(matches)
  console.log(`Created ${matches.length} demo matches`)

  // Create demo board messages
  const boardMessages = [
    {
      title: 'Willkommen im Demo-Modus',
      content: 'Dies ist eine Demo-Nachricht vom Vorstand. Alle Daten können über den Demo-Bereich zurückgesetzt werden.',
      author_id: '00000000-0000-0000-0000-000000000000'
    },
    {
      title: 'Wichtige Vereinsinformationen',
      content: 'Bitte beachten Sie, dass alle Trainingszeiten für die kommende Woche wie gewohnt stattfinden. Bei Fragen wenden Sie sich bitte an Ihren Mannschaftsführer.',
      author_id: '00000000-0000-0000-0000-000000000000'
    }
  ]

  await supabase.from('board_messages').insert(boardMessages)
  console.log(`Created ${boardMessages.length} demo board messages`)

  // Create demo club events
  const events = [
    {
      title: 'Vereinsmeisterschaft',
      description: 'Jährliche Vereinsmeisterschaft mit anschließendem Grillen. Anmeldung bis 31.05.2025',
      event_date: '2025-06-15T10:00:00Z',
      location: 'Zaberfeld Sporthalle',
      author_id: '00000000-0000-0000-0000-000000000000'
    },
    {
      title: 'Jahreshauptversammlung',
      description: 'Ordentliche Jahreshauptversammlung des Vereins. Alle Mitglieder sind herzlich eingeladen.',
      event_date: '2025-03-20T19:00:00Z',
      location: 'Vereinsheim Zaberfeld',
      author_id: '00000000-0000-0000-0000-000000000000'
    },
    {
      title: 'Sommerfest',
      description: 'Großes Sommerfest mit Turnier für alle Altersklassen. Es gibt Preise zu gewinnen!',
      event_date: '2025-07-12T14:00:00Z',
      location: 'Zaberfeld Sportplatz',
      author_id: '00000000-0000-0000-0000-000000000000'
    }
  ]

  await supabase.from('club_events').insert(events)
  console.log(`Created ${events.length} demo events`)

  console.log('Demo data filled successfully')
}

async function resetCategory(supabase: any, category: string) {
  console.log(`Resetting category: ${category}`)

  // Get protected user IDs (first admin and developer)
  const { data: firstUserData } = await supabase.rpc('get_first_user_id')
  const firstUserId = firstUserData
  
  // Get developer profile
  const { data: devProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', 'mdickscheit@gmail.com')
    .single()
  
  const protectedUserIds = [firstUserId, devProfile?.user_id].filter(Boolean)

  switch (category) {
    case 'members': {
      // Delete all profiles except protected users (first admin and developer)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id')
        .neq('user_id', '00000000-0000-0000-0000-000000000000')
        .not('user_id', 'in', `(${protectedUserIds.join(',')})`)

      if (profiles && profiles.length > 0) {
        const userIds = profiles.map((p: any) => p.user_id)

        // Delete user roles first (foreign key)
        await supabase
          .from('user_roles')
          .delete()
          .in('user_id', userIds)

        // Delete profiles
        await supabase
          .from('profiles')
          .delete()
          .in('user_id', userIds)

        // Delete auth users
        for (const userId of userIds) {
          await supabase.auth.admin.deleteUser(userId)
        }
      }
      console.log(`Deleted ${profiles?.length || 0} members (protected users excluded)`)
      break
    }

    case 'teams': {
      // Delete team members first (foreign key)
      await supabase.from('team_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      // Delete teams
      const { count: teamsCount } = await supabase
        .from('teams')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select('*', { count: 'exact', head: true })
      console.log(`Deleted ${teamsCount || 0} teams`)
      break
    }

    case 'matches': {
      const { count: matchesCount } = await supabase
        .from('matches')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select('*', { count: 'exact', head: true })
      console.log(`Deleted ${matchesCount || 0} matches`)
      break
    }

    case 'training': {
      const { count: trainingsCount } = await supabase
        .from('training_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select('*', { count: 'exact', head: true })
      console.log(`Deleted ${trainingsCount || 0} training sessions`)
      break
    }

    case 'qttr': {
      // Delete QTTR files from storage
      const { data: files } = await supabase.storage
        .from('qttr-lists')
        .list()

      if (files && files.length > 0) {
        const filePaths = files.map((f: any) => f.name)
        await supabase.storage
          .from('qttr-lists')
          .remove(filePaths)
        console.log(`Deleted ${filePaths.length} QTTR files`)
      }
      break
    }

    case 'communication': {
      const { count: messagesCount } = await supabase
        .from('board_messages')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select('*', { count: 'exact', head: true })

      const { count: eventsCount } = await supabase
        .from('club_events')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select('*', { count: 'exact', head: true })

      console.log(`Deleted ${messagesCount || 0} messages and ${eventsCount || 0} events`)
      break
    }

    default:
      throw new Error(`Unknown category: ${category}`)
  }

  console.log(`Category ${category} reset successfully`)
}

async function resetAll(supabase: any) {
  console.log('Resetting all data...')

  // Get protected user IDs (first admin and developer)
  const { data: firstUserData } = await supabase.rpc('get_first_user_id')
  const firstUserId = firstUserData
  
  // Get developer profile
  const { data: devProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', 'mdickscheit@gmail.com')
    .single()
  
  const protectedUserIds = [firstUserId, devProfile?.user_id].filter(Boolean)

  // Delete in correct order due to foreign keys
  await supabase.from('team_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('match_pins').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('training_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('board_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('club_events').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Delete QTTR files
  const { data: files } = await supabase.storage
    .from('qttr-lists')
    .list()

  if (files && files.length > 0) {
    const filePaths = files.map((f: any) => f.name)
    await supabase.storage
      .from('qttr-lists')
      .remove(filePaths)
  }

  // Delete ALL profiles and users EXCEPT protected ones (first admin and developer)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id')
    .neq('user_id', '00000000-0000-0000-0000-000000000000')
    .not('user_id', 'in', `(${protectedUserIds.join(',')})`)

  if (profiles && profiles.length > 0) {
    const userIds = profiles.map((p: any) => p.user_id)
    
    await supabase
      .from('user_roles')
      .delete()
      .in('user_id', userIds)

    await supabase
      .from('profiles')
      .delete()
      .in('user_id', userIds)

    for (const userId of userIds) {
      await supabase.auth.admin.deleteUser(userId)
    }
    
    console.log(`Deleted ${profiles.length} users (protected users excluded)`)
  }

  console.log('All data reset successfully - System zurück auf Auslieferungszustand (protected users preserved)')
}
