/**
 * Backfill the two new achievements (halfway, ten_k) for existing users
 * who already qualify but weren't awarded them at solve time.
 */
require("dotenv").config();
const { connectDB, disconnectDB } = require("./connection");
const { User, Solve, UserAchievement } = require("../models");

async function backfill() {
  await connectDB();

  const users = await User.find().lean();
  let awarded = 0;

  for (const u of users) {
    const solveCount = await Solve.countDocuments({ userId: u._id });

    // Check halfway (15+ labs solved)
    if (solveCount >= 15) {
      const exists = await UserAchievement.exists({ userId: u._id, achievementId: "halfway" });
      if (!exists) {
        await UserAchievement.create({ userId: u._id, achievementId: "halfway" });
        console.log(`  ${u.handle}: awarded "Halfway There"`);
        awarded++;
      }
    }

    // Check ten_k (10,000+ points)
    if (u.points >= 10000) {
      const exists = await UserAchievement.exists({ userId: u._id, achievementId: "ten_k" });
      if (!exists) {
        await UserAchievement.create({ userId: u._id, achievementId: "ten_k" });
        console.log(`  ${u.handle}: awarded "Ten Thousand Club"`);
        awarded++;
      }
    }
  }

  console.log(`\nBackfilled ${awarded} achievement(s) across ${users.length} users.`);
  await disconnectDB();
}

backfill().catch(err => { console.error(err); process.exit(1); });
