import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PinData {
  date: string;
  homeTeam: string;
  awayTeam: string;
  spielpin: string;
  spielpartiePin: string | null;
}

interface FailedImport {
  date: string;
  homeTeam: string;
  awayTeam: string;
  spielpin: string;
  spielpartiePin?: string | null;
  reason: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { pins, clubTeam } = await req.json();

    if (!pins || !Array.isArray(pins)) {
      return new Response(
        JSON.stringify({ error: "Invalid pins data" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let successful = 0;
    let failed = 0;
    const failedImports: FailedImport[] = [];

    const normalizedClubTeam =
      typeof clubTeam === "string" && clubTeam.trim() !== ""
        ? clubTeam.trim().toLowerCase()
        : null;

    for (const pin of pins as PinData[]) {
      try {
        console.log(`Processing pin: ${pin.date} - ${pin.homeTeam} vs ${pin.awayTeam}`);

        // Find all matches on this date
        const { data: matches, error: matchError } = await supabase
          .from("matches")
          .select("id, team, opponent, home_team, away_team, club_team, date")
          .eq("date", pin.date);

        if (matchError) {
          console.error("Error finding matches:", matchError);
          failed++;
          failedImports.push({
            date: pin.date,
            homeTeam: pin.homeTeam,
            awayTeam: pin.awayTeam,
            spielpin: pin.spielpin,
            spielpartiePin: pin.spielpartiePin,
            reason: `Datenbankfehler: ${matchError.message}`,
          });
          continue;
        }

        if (!matches || matches.length === 0) {
          console.error(`No matches found for date ${pin.date}. Please import the match schedule first.`);
          failed++;
          failedImports.push({
            date: pin.date,
            homeTeam: pin.homeTeam,
            awayTeam: pin.awayTeam,
            spielpin: pin.spielpin,
            spielpartiePin: pin.spielpartiePin,
            reason: "Kein Spiel am angegebenen Datum gefunden. Bitte zuerst Spielplan importieren.",
          });
          continue;
        }

        let matchesToCheck = matches;

        if (normalizedClubTeam) {
          const filteredMatches = matches.filter((m) => {
            const clubTeamName = (m.club_team ?? m.team ?? "").toLowerCase();
            return (
              clubTeamName.includes(normalizedClubTeam) ||
              normalizedClubTeam.includes(clubTeamName)
            );
          });

          if (filteredMatches.length > 0) {
            matchesToCheck = filteredMatches;
          }
        }

        // Find exact match with home and away team (flexible matching)
        const exactMatch = matchesToCheck.find(m => {
          const matchHome = m.home_team ?? m.team;
          const matchAway = m.away_team ?? m.opponent;
          const homeMatch =
            matchHome.toLowerCase().includes(pin.homeTeam.toLowerCase()) ||
            pin.homeTeam.toLowerCase().includes(matchHome.toLowerCase());
          const awayMatch =
            matchAway.toLowerCase().includes(pin.awayTeam.toLowerCase()) ||
            pin.awayTeam.toLowerCase().includes(matchAway.toLowerCase());
          return homeMatch && awayMatch;
        });

        if (!exactMatch) {
          const availableMatches = matches.map(m => `${(m.home_team ?? m.team)} vs ${(m.away_team ?? m.opponent)}`).join(', ');
          console.error(
            `No exact match found for ${pin.homeTeam} vs ${pin.awayTeam}. ` +
            `Available: ${availableMatches}`
          );
          failed++;
          failedImports.push({
            date: pin.date,
            homeTeam: pin.homeTeam,
            awayTeam: pin.awayTeam,
            spielpin: pin.spielpin,
            spielpartiePin: pin.spielpartiePin,
            reason: `Keine passende Begegnung gefunden. Verfügbare Spiele: ${availableMatches}`,
          });
          continue;
        }

        console.log(`Match found: ID ${exactMatch.id}`);

        // Upsert pins
        const { error: insertError } = await supabase
          .from("match_pins")
          .upsert({
            match_id: exactMatch.id,
            spielpin: pin.spielpin,
            spielpartie_pin: pin.spielpartiePin,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "match_id",
          });

        if (insertError) {
          console.error("Error inserting pin:", insertError);
          failed++;
          failedImports.push({
            date: pin.date,
            homeTeam: pin.homeTeam,
            awayTeam: pin.awayTeam,
            spielpin: pin.spielpin,
            spielpartiePin: pin.spielpartiePin,
            reason: `Fehler beim Speichern: ${insertError.message}`,
          });
          continue;
        }

        console.log(`Successfully imported pin for match ${exactMatch.id}`);
        successful++;
      } catch (error) {
        console.error("Error processing pin:", error);
        failed++;
        failedImports.push({
          date: pin.date,
          homeTeam: pin.homeTeam,
          awayTeam: pin.awayTeam,
          spielpin: pin.spielpin,
          spielpartiePin: pin.spielpartiePin,
          reason: `Unerwarteter Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        });
      }
    }

    return new Response(
      JSON.stringify({
        successful,
        failed,
        total: pins.length,
        failedImports,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in import-pins function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
