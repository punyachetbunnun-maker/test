import WebSocket from 'ws';

const SERVER_URL = "wss://partykit.fibonnaci314.partykit.dev/parties/main/my-new-room"; 
const AUTH_PACKET = ["C", "7enx8an7xm"]; 

const SONGS = [
    "music_aria_math_metal_cover.mp3", "music_neotropolis.mp3", "music_every_end.mp3", 
    "music_tempo_di_valse.mp3", "music_order.mp3", "music_search_party.mp3", 
    "music_no_hints_here.mp3", "music_believe.mp3", "music_options_ex.mp3", 
    "music_hold_on.mp3", "music_a_new_dawn.mp3", "music_genesis.mp3", 
    "music_the_valley_of_death.mp3", "music_kanon_d_dur_strings_orchestra.mp3", 
    "music_lightmare.mp3", "music_at_the_speed_of_light.mp3", "music_let_there_be_light.mp3", 
    "music_divine_intervention.mp3", "music_unity.mp3", "music_were_finally_landing.mp3", 
    "music_winged_hussars.mp3", "music_preacher_trimmed.m4a", "music_cold_winds.mp3", 
    "music_spectre.mp3", "music_forest_maze.mp3", "music_keygen_church.mp3", 
    "music_ricochet_love.mp3", "music_number_go_up.mp3", "music_lil_qoo.mp3", 
    "music_hold.mp3", "music_firefly.mp3", "music_the_part_where_he_kills_you.mp3", 
    "music_bilewater_metal_cover.mp3", "music_ethereal_workshop_cover.mp3", 
    "music_trillium.mp3", "music_lbsfs_original.mp3", "music_third_sun.mp3", 
    "music_bonk_hq.mp3", "music_surface_tension.mp3", "music_otherworldy_foe_remix.mp3", 
    "music_pixel_pig.mp3", "music_want_some_fun.mp3", "music_bombs_away.mp3", 
    "music_death.mp3", "music_enemy_retreating.mp3", "music_meat_factory.mp3", 
    "music_19zz.mp3", "music_song_for_the_masses.mp3", "music_lbsfs.mp3", 
    "music_animation_warrior_theme.mp3", "music_mlg_drifting.mp3", "music_it_go.mp3", 
    "music_sing_sing_red_indigo.mp3", "music_emomomo.mp3", "music_megalo_strike_back.mp3", 
    "music_the_other_side.mp3", "music_mlg_dreamcore.mp3", "music_one_forgotten_night.mp3", 
    "music_its_been_a_long_time.mp3", "music_grand_glade.mp3", "music_welcome_to_the_ridge.mp3", 
    "music_bounce.mp3", "music_tormented_trobbio.mp3", "music_onett_theme.mp3", 
    "music_asgore_runs_over_dess.mp3", "music_guns_blazing.mp3", "music_new_life.mp3", 
    "music_disaster.mp3", "music_theme_of_really_cool_bird.mp3", "music_waterfall.mp3", 
    "music_comptine_d`un_autre_ete.mp3", "music_battle_against_a_machine.mp3", 
    "music_frog.mp3", "music_yaai.mp3", "music_doodle.mp3", "music_theyaremanycolors.mp3", 
    "music_icosa.mp3", "music_afterlife.mp3", "music_wavetapper.mp3", "music_end_of_the_line.mp3", 
    "music_spider_dance.mp3", "music_end_of_the_universe.mp3", "music_forest_maze_original.mp3", 
    "music_final_encounter.mp3", "music_options.mp3", "music_peanut_butter_jelly_time.mp3", 
    "music_better_credits.mp3", "music_mlg_the_hyperplex_preview_1.mp3", "thx.mp3", 
    "outro.mp3", "500_cigarettes.mp3", "didnt_have_to.mp3", "correct.mp3", 
    "hell_nah.mp3", "weirder_route.mp3", "ping.mp3", "fish.mp3", "you_are_an_idiot.mp3", 
    "admin_fah.mp3", "drip.mp3", "rizz.mp3", "sus.mp3", "dont_play_this_one.mp3", 
    "womp_womp.mp3", "emotional_damage.mp3", "weird_route.mp3", "mlg.mp3", 
    "also_dont_play_this_one.mp3", "omg.mp3", "oh_hello_there.mp3", "vine.mp3", 
    "shutup.mp3", "core.mp3", "discord_leave.mp3", "wrong.mp3", "unweird_jingle.mp3", 
    "pluh.mp3"
];

let ws = null;
let voteInterval = null;

function connectToGame() {
    console.log("Connecting to game server...");
    ws = new WebSocket(SERVER_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    ws.on('open', () => {
        console.log("Connected! Authenticating account...");
        ws.send(JSON.stringify(AUTH_PACKET));

        if (voteInterval) clearInterval(voteInterval);

        voteInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                const randomSong = SONGS[Math.floor(Math.random() * SONGS.length)];
                const voteCommand = `/g vote ${randomSong}`;
                
                ws.send(JSON.stringify(["M", voteCommand]));
                console.log(`Sent: ${voteCommand}`);
            }
        }, 5000);
    });

    ws.on('message', (data) => {
        try {
            const packet = JSON.parse(data.toString());
            if (Array.isArray(packet) && packet[0] === "M") {
                let rawChatString = typeof packet[6] === "string" ? packet[6] : "";
                let actualMessage = rawChatString.substring(rawChatString.indexOf(": ") + 2).trim();

                if (actualMessage === "!stop") {
                    console.log("Stop command received! Shutting down...");
                    clearInterval(voteInterval);
                    ws.close();
                    process.exit(0);
                }
            }
        } catch (err) {}
    });

    ws.on('close', () => {
        console.log("Disconnected. Reconnecting in 5 seconds...");
        clearInterval(voteInterval);
        setTimeout(connectToGame, 5000);
    });

    ws.on('error', (err) => {
        console.error("Socket error:", err.message);
    });
}

connectToGame();
  
