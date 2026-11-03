require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDB, disconnectDB } = require("./connection");
const { User, Solve, Lab } = require("../models");

const SCOREBOARD_USERS = [
  { handle: "hackerguru_",       points: 11500, labsSolved: 30 },
  { handle: "RootX47",           points: 11500, labsSolved: 30 },
  { handle: "nightwing",         points: 3690,  labsSolved: 16 },
  { handle: "9mm_memphis_cult",  points: 3350,  labsSolved: 15 },
  { handle: "Phoenix",           points: 800,   labsSolved: 6  },
  { handle: "GHOST",             points: 85,    labsSolved: 1  },
  { handle: "Admin",             points: 80,    labsSolved: 1  },
  { handle: "hackerguru__",      points: 0,     labsSolved: 0  },
  { handle: "Ghhjnn",            points: 0,     labsSolved: 0  },
  { handle: "kujuta",            points: 0,     labsSolved: 0  },
];

const EXTRA_USERS = [
  { handle: "d4rkmatt3r",        points: 10800, labsSolved: 29 },
  { handle: "n0_m3rcy",          points: 10200, labsSolved: 28 },
  { handle: "cyph3r_monk",       points: 9750,  labsSolved: 27 },
  { handle: "hexbreaker",        points: 9300,  labsSolved: 26 },
  { handle: "voidwalker_0x",     points: 8900,  labsSolved: 25 },
  { handle: "null_ptr_xc",       points: 8450,  labsSolved: 24 },
  { handle: "ZeroCool99",        points: 7980,  labsSolved: 23 },
  { handle: "pr0xy_hunt3r",      points: 7600,  labsSolved: 22 },
  { handle: "OverflowKing",      points: 7100,  labsSolved: 21 },
  { handle: "execpayload",       points: 6800,  labsSolved: 20 },
  { handle: "k3rn3l_pwnr",       points: 6400,  labsSolved: 19 },
  { handle: "shellshock_v2",     points: 6050,  labsSolved: 18 },
  { handle: "b1nary_ghost",      points: 5700,  labsSolved: 17 },
  { handle: "toxic_payload",     points: 5100,  labsSolved: 16 },
  { handle: "r00tkitfox",        points: 4800,  labsSolved: 15 },
  { handle: "xss_artist",        points: 4500,  labsSolved: 14 },
  { handle: "inj3ct0r_",         points: 4200,  labsSolved: 13 },
  { handle: "sig_term",          points: 3900,  labsSolved: 12 },
  { handle: "LostPacket",        points: 3600,  labsSolved: 11 },
  { handle: "bufferzone_x",      points: 3300,  labsSolved: 10 },
  { handle: "glitch_pr0t0c0l",   points: 3000,  labsSolved: 9  },
  { handle: "f4ult_tol3r4nt",    points: 2750,  labsSolved: 9  },
  { handle: "RevEngineer_",      points: 2500,  labsSolved: 8  },
  { handle: "tr4c3_rout3",       points: 2300,  labsSolved: 8  },
  { handle: "m4sk3d_ip",         points: 2100,  labsSolved: 7  },
  { handle: "void_c4ll",         points: 1950,  labsSolved: 7  },
  { handle: "packet_ghost",      points: 1780,  labsSolved: 6  },
  { handle: "Cr4ckm4p",          points: 1620,  labsSolved: 6  },
  { handle: "fuzzy_l0gic",       points: 1480,  labsSolved: 5  },
  { handle: "str1ng_overflow",   points: 1350,  labsSolved: 5  },
  { handle: "h4x_the_planet",    points: 1220,  labsSolved: 4  },
  { handle: "deadbeef_0x",       points: 1100,  labsSolved: 4  },
  { handle: "segfault_",         points: 980,   labsSolved: 4  },
  { handle: "0x41414141",        points: 870,   labsSolved: 3  },
  { handle: "netrunner_v3",      points: 760,   labsSolved: 3  },
  { handle: "inject_and_pray",   points: 660,   labsSolved: 3  },
  { handle: "ph4ntom_exec",      points: 570,   labsSolved: 2  },
  { handle: "dumpster_f1r3",     points: 490,   labsSolved: 2  },
  { handle: "c0de_sm0k3",        points: 420,   labsSolved: 2  },
  { handle: "l4tent_thr34t",     points: 360,   labsSolved: 2  },
  { handle: "wh1sper_net",       points: 300,   labsSolved: 1  },
  { handle: "bl4ck_b0x_",        points: 250,   labsSolved: 1  },
  { handle: "cr4b_m3ntal1ty",    points: 200,   labsSolved: 1  },
  { handle: "zer0_day_drifter",  points: 160,   labsSolved: 1  },
  { handle: "pr1v8_escal4te",    points: 130,   labsSolved: 1  },
  { handle: "NoobPwnr",          points: 100,   labsSolved: 1  },
  { handle: "just_l00king",      points: 0,     labsSolved: 0  },
  { handle: "new_recruit_01",    points: 0,     labsSolved: 0  },
  { handle: "sp3ctator_",        points: 0,     labsSolved: 0  },
  { handle: "test_acc0unt",      points: 0,     labsSolved: 0  },
];

const ALL_USERS = [...SCOREBOARD_USERS, ...EXTRA_USERS];

async function seedUsers() {
  await connectDB();

  const labs = await Lab.find({}).select("_id points").lean();
  const labPool = [...labs].sort(() => 0.5 - Math.random());

  const PASSWORD_HASH = await bcrypt.hash("PromptPwn2026!", 10);

  let created = 0;
  let skipped = 0;

  for (const u of ALL_USERS) {
    const existing = await User.findOne({ handle: u.handle });
    if (existing) { skipped++; continue; }

    const user = await User.create({
      handle: u.handle,
      email: `${u.handle.toLowerCase().replace(/[^a-z0-9]/g, "")}@promptpwn.fake`,
      passwordHash: PASSWORD_HASH,
      points: u.points,
    });

    if (u.labsSolved > 0 && labs.length > 0) {
      const toSolve = labPool.slice(0, Math.min(u.labsSolved, labs.length));
      const solves = toSolve.map((lab) => ({
        userId: user._id,
        labId: lab._id,
        pointsAwarded: Math.floor(u.points / u.labsSolved),
        cleanSolve: Math.random() > 0.4,
      }));
      try {
        await Solve.insertMany(solves, { ordered: false });
      } catch (_) { /* ignore duplicate key errors */ }
    }

    created++;
  }

  console.log(`User seed done: ${created} created, ${skipped} skipped.`);
  await disconnectDB();
}

if (require.main === module) {
  seedUsers().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { seedUsers };
