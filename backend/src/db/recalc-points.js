/**
 * Recalculate all users' points based on current lab point values.
 * Updates each Solve.pointsAwarded to match the lab's current points,
 * then recalculates each user's total from their solves minus hint purchases.
 */
require("dotenv").config();
const { connectDB, disconnectDB } = require("./connection");
const { User, Lab, Solve, HintPurchase } = require("../models");

async function recalcPoints() {
  await connectDB();

  // 1. Build a map of labId -> current points
  const labs = await Lab.find().select("_id points").lean();
  const labPoints = new Map(labs.map(l => [l._id.toString(), l.points]));

  console.log(`Found ${labs.length} labs.`);
  console.log("Lab point map:", Object.fromEntries(labPoints));

  // 2. Update every Solve record to match the current lab points
  const solves = await Solve.find().lean();
  let solvesUpdated = 0;
  for (const s of solves) {
    const currentPts = labPoints.get(s.labId.toString());
    if (currentPts !== undefined && s.pointsAwarded !== currentPts) {
      await Solve.updateOne({ _id: s._id }, { $set: { pointsAwarded: currentPts } });
      solvesUpdated++;
    }
  }
  console.log(`Updated ${solvesUpdated} / ${solves.length} solve records.`);

  // 3. Recalculate each user's total points = sum(solve points) - sum(hint costs)
  const users = await User.find().lean();
  let usersUpdated = 0;

  for (const u of users) {
    const userSolves = await Solve.find({ userId: u._id }).lean();
    const totalEarned = userSolves.reduce((sum, s) => sum + s.pointsAwarded, 0);

    const hintPurchases = await HintPurchase.find({ userId: u._id }).lean();
    const totalSpent = hintPurchases.reduce((sum, h) => sum + (h.cost || 0), 0);

    const newPoints = totalEarned - totalSpent;
    const oldPoints = u.points;

    if (oldPoints !== newPoints) {
      await User.updateOne({ _id: u._id }, { $set: { points: newPoints } });
      console.log(`  ${u.handle}: ${oldPoints} -> ${newPoints} (earned: ${totalEarned}, spent on hints: ${totalSpent})`);
      usersUpdated++;
    } else {
      console.log(`  ${u.handle}: ${oldPoints} (unchanged)`);
    }
  }

  console.log(`\nRecalculated ${usersUpdated} / ${users.length} users.`);
  await disconnectDB();
}

recalcPoints().catch(err => { console.error(err); process.exit(1); });
